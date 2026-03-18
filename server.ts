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

// Initialize Supabase Client for Storage
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

const JWT_SECRET = process.env.JWT_SECRET || 'ramseyisinlevel300inknustandisbuildinganapp';
const UPLOADS_DIR = process.env.UPLOADS_PATH || path.join(process.cwd(), 'uploads');

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Multer memory storage for direct passing to Supabase
const upload = multer({ storage: multer.memoryStorage() });

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  
  // FIX: Socket.io configuration to stop 400 loops
  const io = new Server(httpServer, {
    cors: {
      origin: ["https://makeshift-site.vercel.app", "http://localhost:5173", /\.vercel\.app$/],
      methods: ["GET", "POST"],
      credentials: true
    },
    transports: ['websocket', 'polling'],
    allowEIO3: true
  });

  const userSockets = new Map<string, string>();
  const socketUsers = new Map<string, string>();

  io.on('connection', (socket) => {
    socket.on('authenticate', (userId: string) => {
      userSockets.set(userId, socket.id);
      socketUsers.set(socket.id, userId);
    });

    socket.on('send_message', (data) => {
      const receiverSocketId = userSockets.get(data.receiver_id);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('new_message', data);
      }
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
    origin: ["https://makeshift-site.vercel.app", "http://localhost:5173", /\.vercel\.app$/],
    credentials: true
  }));
  app.use(express.json());

  // Middleware for Supabase/Google UUIDs
  const authenticate = (req: any, res: any, next: any) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    try {
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

  // --- LISTING ROUTES ---

  // 1. Get All Listings (FIXED: Dynamic parameters and LEFT JOIN)
  app.get('/api/listings', async (req, res) => {
    try {
      const { search, category, seller_id, limit = 12, offset = 0 } = req.query;
      let query = `SELECT l.*, COALESCE(u.name, 'Campus Seller') as seller_name FROM listings l LEFT JOIN users u ON l.seller_id = u.id`;
      const params: any[] = [];
      const conditions: string[] = [];

      if (seller_id) {
        params.push(seller_id);
        conditions.push(`l.seller_id = $${params.length}`);
      } else {
        conditions.push("l.status = 'available'");
      }

      if (category && category !== 'All') {
        params.push(category);
        conditions.push(`l.category = $${params.length}`);
      }

      if (search) {
        params.push(`%${search}%`);
        conditions.push(`(l.title ILIKE $${params.length} OR l.description ILIKE $${params.length})`);
      }

      if (conditions.length > 0) query += " WHERE " + conditions.join(" AND ");
      query += ` ORDER BY l.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(Number(limit), Number(offset));

      const result = await pool.query(query, params);
      res.json(result.rows || []);
    } catch (err: any) {
      console.error('DATABASE ERROR:', err.message);
      res.status(200).json([]); 
    }
  });

  // 2. Get Single Listing (FIXED: Handles specific ID lookup)
  app.get('/api/listings/:id', async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT l.*, COALESCE(u.name, 'Campus Seller') as seller_name 
        FROM listings l LEFT JOIN users u ON l.seller_id = u.id 
        WHERE l.id = $1`, [req.params.id]);
      if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
      res.json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  // 3. Create Listing (With Supabase Storage)
  app.post('/api/listings', authenticate, upload.single('image'), async (req: any, res) => {
    try {
      const { title, description, price, category } = req.body;
      let image_url = req.body.image_url || '';

      if (req.file) {
        const fileName = `${Date.now()}-${req.file.originalname.replace(/\s/g, '_')}`;
        const { error } = await supabase.storage.from('listing-images').upload(fileName, req.file.buffer, { contentType: req.file.mimetype });
        if (error) throw error;
        const { data } = supabase.storage.from('listing-images').getPublicUrl(fileName);
        image_url = data.publicUrl;
      }

      await pool.query(
        'INSERT INTO listings (seller_id, title, description, price, category, image_url, status) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [req.user.id, title, description, parseFloat(price), category, image_url, 'available']
      );
      res.json({ success: true });
    } catch (err) {
      console.error('Upload Error:', err);
      res.status(500).json({ error: 'Failed' });
    }
  });

  // --- CART ROUTES (The logic you were missing) ---

  app.get('/api/cart', authenticate, async (req: any, res) => {
    try {
      const result = await pool.query(`
        SELECT c.id as cart_item_id, l.* FROM cart_items c 
        JOIN listings l ON c.listing_id = l.id 
        WHERE c.user_id = $1`, [req.user.id]);
      res.json(result.rows || []);
    } catch (err) {
      res.status(500).json([]);
    }
  });

  app.post('/api/cart', authenticate, async (req: any, res) => {
    try {
      const { listing_id } = req.body;
      await pool.query(
        'INSERT INTO cart_items (user_id, listing_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [req.user.id, listing_id]
      );
      res.json({ success: true });
    } catch (err) {
      console.error('Cart Error:', err);
      res.status(500).json({ error: 'Failed to add to cart' });
    }
  });

  app.delete('/api/cart/:id', authenticate, async (req: any, res) => {
    try {
      await pool.query('DELETE FROM cart_items WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Failed to remove' });
    }
  });

  // --- MESSAGES ROUTES ---

  // GET messages for a specific conversation
app.get('/api/messages/:otherUserId', authenticate, async (req: any, res) => {
  try {
    const { otherUserId } = req.params;
    const { listing_id } = req.query;

    const result = await pool.query(`
      SELECT m.*, u1.name as sender_name, u2.name as receiver_name
      FROM messages m
      JOIN users u1 ON m.sender_id = u1.id
      JOIN users u2 ON m.receiver_id = u2.id
      WHERE 
        ((m.sender_id = $1 AND m.receiver_id = $2) OR (m.sender_id = $2 AND m.receiver_id = $1))
        AND m.listing_id = $3
      ORDER BY m.created_at ASC`, 
      [req.user.id, otherUserId, listing_id]
    );

    res.json(result.rows || []);
  } catch (err) {
    console.error('Error fetching conversation:', err);
    res.status(500).json([]);
  }
});

  app.post('/api/messages', authenticate, async (req: any, res) => {
    try {
      const { receiver_id, listing_id, content } = req.body;
      await pool.query(
        'INSERT INTO messages (sender_id, receiver_id, listing_id, content) VALUES ($1, $2, $3, $4)',
        [req.user.id, receiver_id, listing_id, content]
      );
      res.json({ success: true });
    } catch (err) {
      console.error('Message Error:', err);
      res.status(500).json({ error: 'Failed to send' });
    }
  });

  // --- USER DATA STUB (Prevents frontend loops) ---
  app.get('/api/users/:id', async (req, res) => {
    try {
      const result = await pool.query('SELECT id, name, email, avatar_url FROM users WHERE id = $1', [req.params.id]);
      res.json(result.rows[0] || { name: 'Campus Seller' });
    } catch (err) {
      res.json({ name: 'Campus Seller' });
    }
  });

  // --- PROFILE STUBS ---
  app.get('/api/warnings', authenticate, (req, res) => res.json([]));
  app.get('/api/transactions', authenticate, (req, res) => res.json([]));

  // --- PRODUCTION SERVING ---
  const PORT = process.env.PORT || 3000;
  
  if (process.env.NODE_ENV === 'production') {
    const distPath = path.resolve(process.cwd(), 'dist'); 
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();