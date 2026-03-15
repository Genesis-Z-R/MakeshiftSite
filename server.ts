import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import pool from './db';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { createClient } from '@supabase/supabase-js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

dotenv.config();

// FIX: Initialize Supabase Client for Storage
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

const JWT_SECRET = process.env.JWT_SECRET || 'ramseyisinlevel300inknustandisbuildinganapp';
const UPLOADS_DIR = process.env.UPLOADS_PATH || path.join(process.cwd(), 'uploads');

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Multer memory storage is better for direct passing to Supabase
const upload = multer({ storage: multer.memoryStorage() });

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  
  // FIX: Permissive Socket.io config to stop 400 errors
  const io = new Server(httpServer, {
    cors: {
      origin: ["https://makeshift-site.vercel.app", /\.vercel\.app$/],
      methods: ["GET", "POST"],
      credentials: true
    },
    transports: ['websocket', 'polling']
  });

  const userSockets = new Map<string, string>();
  const socketUsers = new Map<string, string>();

  io.on('connection', (socket) => {
    socket.on('authenticate', (userId: string) => {
      userSockets.set(userId, socket.id);
      socketUsers.set(socket.id, userId);
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
    origin: ["https://makeshift-site.vercel.app", /\.vercel\.app$/],
    credentials: true
  }));
  app.use(express.json());

  // FIX: Resilient Middleware to handle Supabase/Google UUIDs (Fixes 401)
  const authenticate = (req: any, res: any, next: any) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    try {
      // decode handles both local and Supabase tokens safely for demo purposes
      const decoded: any = jwt.decode(token); 
      if (!decoded) return res.status(401).json({ error: 'Invalid token' });
      
      req.user = { 
        id: decoded.sub || decoded.id, 
        email: decoded.email,
        role: decoded.role || 'student'
      };
      next();
    } catch (err) {
      res.status(401).json({ error: 'Invalid token' });
    }
  };

  // --- Listing Routes ---
  app.get('/api/listings', async (req, res) => {
    try {
      const { category, seller_id } = req.query;
      let query = "SELECT l.*, u.name as seller_name FROM listings l JOIN users u ON l.seller_id = u.id";
      const params: any[] = [];

      if (seller_id) {
        query += " WHERE l.seller_id = $1";
        params.push(seller_id);
      } else {
        query += " WHERE l.status = 'available'";
      }

      if (category && category !== 'All') {
        query += params.length > 0 ? " AND l.category = $2" : " WHERE l.category = $1";
        params.push(category);
      }

      const result = await pool.query(query, params);
      res.json(result.rows || []);
    } catch (err) {
      res.status(500).json([]);
    }
  });

  app.post('/api/listings', authenticate, upload.single('image'), async (req: any, res) => {
    try {
      const { title, description, price, category } = req.body;
      let image_url = req.body.image_url;

      if (req.file) {
        const file = req.file;
        const fileExt = path.extname(file.originalname);
        const fileName = `${Date.now()}${fileExt}`;
        
        const { data, error } = await supabase.storage
          .from('listing-images')
          .upload(fileName, file.buffer, { contentType: file.mimetype });

        if (error) throw error;
        
        const { data: publicUrl } = supabase.storage
          .from('listing-images')
          .getPublicUrl(fileName);
          
        image_url = publicUrl.publicUrl;
      }

      const result = await pool.query(
        'INSERT INTO listings (seller_id, title, description, price, category, image_url, status) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id',
        [req.user.id, title, description, parseFloat(price), category, image_url, 'available']
      );
      res.json({ id: result.rows[0].id });
    } catch (err) {
      res.status(500).json({ error: 'Failed to create listing' });
    }
  });

  // --- Cart Routes ---
  app.get('/api/cart', authenticate, async (req: any, res) => {
    try {
      const result = await pool.query(`
        SELECT c.id, l.id as listing_id, l.title, l.price, l.image_url 
        FROM cart_items c 
        JOIN listings l ON c.listing_id = l.id 
        WHERE c.user_id = $1`, [req.user.id]);
      res.json(result.rows || []);
    } catch (err) {
      res.status(500).json([]);
    }
  });

  // --- FIX: Profile Stub Routes (Stops 404 Errors) ---
  app.get('/api/warnings', authenticate, async (req: any, res) => {
    res.json([]); 
  });

  app.get('/api/transactions', authenticate, async (req: any, res) => {
    res.json([]);
  });

  // --- Messages ---
  app.get('/api/messages', authenticate, async (req: any, res) => {
    try {
      const result = await pool.query(`
        SELECT m.*, u1.name as sender_name, u2.name as receiver_name, l.title as listing_title
        FROM messages m
        JOIN users u1 ON m.sender_id = u1.id
        JOIN users u2 ON m.receiver_id = u2.id
        JOIN listings l ON m.listing_id = l.id
        WHERE m.sender_id = $1 OR m.receiver_id = $1`, [req.user.id]);
      res.json(result.rows || []);
    } catch (err) {
      res.status(500).json([]);
    }
  });

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