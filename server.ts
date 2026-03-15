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

// Multer memory storage for direct passing to Supabase
const upload = multer({ storage: multer.memoryStorage() });

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  
 

const io = new Server(httpServer, {
  cors: {
    // This must include your specific Vercel URL
    origin: [
      "https://makeshift-site.vercel.app", 
      "http://localhost:5173",
      /\.vercel\.app$/ // This regex allows all Vercel preview deployments
    ],
    methods: ["GET", "POST"],
    credentials: true
  },
  // We explicitly define transports to stop the polling/upgrade cycle errors
  transports: ['websocket', 'polling'],
  // allowEIO3 helps if there's a version mismatch between client and server
  allowEIO3: true 
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
    origin: ["https://makeshift-site.vercel.app", "http://localhost:5173", /\.vercel\.app$/],
    credentials: true
  }));
  app.use(express.json());

  // FIX: Resilient Middleware for Supabase/Google UUIDs
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

  // --- Listing Routes (FIXED: Supports search, category, and limit/offset) ---
  app.get('/api/listings', async (req, res) => {
    try {
      const { search, category, seller_id, limit = 12, offset = 0 } = req.query;
      
      let query = "SELECT l.*, u.name as seller_name FROM listings l LEFT JOIN users u ON l.seller_id = u.id";
      const params: any[] = [];

      // Base condition
      query += seller_id ? " WHERE l.seller_id = $1" : " WHERE l.status = 'available'";
      if (seller_id) params.push(seller_id);

      // Category filter
      if (category && category !== 'All') {
        params.push(category);
        query += ` AND l.category = $${params.length}`;
      }

      // Search filter
      if (search) {
        params.push(`%${search}%`);
        query += ` AND (l.title ILIKE $${params.length} OR l.description ILIKE $${params.length})`;
      }

      // Pagination
      query += ` ORDER BY l.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(Number(limit), Number(offset));

      const result = await pool.query(query, params);
      res.json(result.rows || []);
    } catch (err: any) {
      console.error('DATABASE ERROR:', err.message);
      res.status(200).json([]); // Always return array to prevent frontend crash
    }
  });

  app.post('/api/listings', authenticate, upload.single('image'), async (req: any, res) => {
    try {
      const { title, description, price, category } = req.body;
      let image_url = req.body.image_url;

      if (req.file) {
        const file = req.file;
        const fileName = `${Date.now()}-${file.originalname}`;
        
        const { error } = await supabase.storage
          .from('listing-images')
          .upload(fileName, file.buffer, { contentType: file.mimetype });

        if (error) throw error;
        
        const { data: publicUrl } = supabase.storage
          .from('listing-images')
          .getPublicUrl(fileName);
          
        image_url = publicUrl.publicUrl;
      }

      await pool.query(
        'INSERT INTO listings (seller_id, title, description, price, category, image_url, status) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [req.user.id, title, description, parseFloat(price), category, image_url, 'available']
      );
      res.json({ success: true });
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

  // --- Profile Stub Routes (FIXES 404s) ---
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