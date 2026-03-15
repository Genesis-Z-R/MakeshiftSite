import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import pool from './db';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import axios from 'axios';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'campus-secret-key';
const UPLOADS_DIR = process.env.UPLOADS_PATH || path.join(process.cwd(), 'uploads');

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  
  // FIX: Support string UUIDs for socket mapping
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || "*",
      methods: ["GET", "POST"],
      credentials: true
    }
  });

  const userSockets = new Map<string, string>(); // userId (UUID) -> socketId
  const socketUsers = new Map<string, string>(); // socketId -> userId (UUID)

  io.on('connection', (socket) => {
    socket.on('authenticate', (userId: string) => {
      userSockets.set(userId, socket.id);
      socketUsers.set(socket.id, userId);
    });

    socket.on('send_message', (data) => {
      const receiverSocketId = userSockets.get(data.receiver_id);
      if (receiverSocketId) io.to(receiverSocketId).emit('new_message', data);
    });

    socket.on('disconnect', () => {
      const userId = socketUsers.get(socket.id);
      if (userId) {
        userSockets.delete(userId);
        socketUsers.delete(socket.id);
      }
    });
  });

  app.use(cors({
    origin: process.env.FRONTEND_URL || "*",
    credentials: true
  }));
  app.use(express.json());
  app.use('/uploads', express.static(UPLOADS_DIR));

  // Middleware to verify JWT and handle UUID sub
  const authenticate = (req: any, res: any, next: any) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    try {
      // For Supabase/Google Auth, we often use jwt.decode or verify against their secret
      const decoded: any = jwt.verify(token, JWT_SECRET);
      req.user = { id: decoded.id || decoded.sub, email: decoded.email, role: decoded.role };
      next();
    } catch (err) {
      res.status(401).json({ error: 'Invalid token' });
    }
  };

  // --- Listing Routes ---
  app.get('/api/listings', async (req, res) => {
    const { search, category, sort, limit = 12, offset = 0, seller_id } = req.query;
    
    // JOIN users to get seller_name
    let query = "SELECT listings.*, users.name as seller_name FROM listings JOIN users ON listings.seller_id = users.id";
    const params: any[] = [];
    let paramIndex = 1;

    if (seller_id) {
      query += ` WHERE seller_id = $${paramIndex}`;
      params.push(seller_id);
      paramIndex++;
    } else {
      query += " WHERE status = 'available'";
    }

    if (category && category !== 'All') {
      query += ` AND category = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }

    if (sort === 'price_low') query += ' ORDER BY price ASC';
    else if (sort === 'price_high') query += ' ORDER BY price DESC';
    else query += ' ORDER BY created_at DESC';

    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(Number(limit), Number(offset));

    try {
      const result = await pool.query(query, params);
      res.json(result.rows || []); // Always return array
    } catch (err) {
      res.status(500).json([]); // Defensive: prevent frontend .map crash
    }
  });

  app.post('/api/listings', authenticate, upload.single('image'), async (req: any, res) => {
    const { title, description, price, category } = req.body;
    const image_url = req.file ? `/uploads/${req.file.filename}` : req.body.image_url;
    try {
      const result = await pool.query(
        'INSERT INTO listings (seller_id, title, description, price, category, image_url, status) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id',
        [req.user.id, title, description, parseFloat(price), category, image_url, 'available']
      );
      res.json({ id: result.rows[0].id });
    } catch (err) {
      res.status(500).json({ error: 'Failed to create listing' });
    }
  });

  // --- Cart Routes (Renamed to 'cart_items' to match your db.ts) ---
  app.get('/api/cart', authenticate, async (req: any, res) => {
    try {
      const result = await pool.query(`
        SELECT cart_items.id, listings.id as listing_id, listings.title, listings.price, listings.image_url, listings.status
        FROM cart_items
        JOIN listings ON cart_items.listing_id = listings.id
        WHERE cart_items.user_id = $1
      `, [req.user.id]);
      res.json(result.rows || []);
    } catch (err) {
      res.status(500).json([]);
    }
  });

  app.post('/api/cart', authenticate, async (req: any, res) => {
    const { listing_id } = req.body;
    try {
      await pool.query('INSERT INTO cart_items (user_id, listing_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [req.user.id, listing_id]);
      res.json({ success: true });
    } catch (err) {
      res.status(400).json({ error: 'Failed to add to cart' });
    }
  });

  app.delete('/api/cart/:id', authenticate, async (req: any, res) => {
    try {
      await pool.query('DELETE FROM cart_items WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Failed to remove from cart' });
    }
  });

  // --- Message Routes (Fixed for UUIDs) ---
  app.get('/api/messages', authenticate, async (req: any, res) => {
    try {
      const result = await pool.query(`
        SELECT messages.*, u1.name as sender_name, u2.name as receiver_name, listings.title as listing_title
        FROM messages
        JOIN users u1 ON messages.sender_id = u1.id
        JOIN users u2 ON messages.receiver_id = u2.id
        JOIN listings ON messages.listing_id = listings.id
        WHERE sender_id = $1 OR receiver_id = $1
        ORDER BY created_at DESC
      `, [req.user.id]);
      res.json(result.rows || []);
    } catch (err) {
      res.status(500).json([]);
    }
  });

  // --- Production Serving ---
  const PORT = process.env.PORT || 3000;
  if (process.env.NODE_ENV === 'production') {
    const distPath = path.join(process.cwd(), 'frontend/dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
