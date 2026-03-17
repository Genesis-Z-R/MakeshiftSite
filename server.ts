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
  
  // FIX: Permissive Socket.io config to stop 400 errors and CORS blocks
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

  // --- Listing Routes ---

  // 1. Get All Listings (FIXED: Dynamic parameters and LEFT JOIN)
  app.get('/api/listings', async (req, res) => {
    try {
      const { search, category, seller_id, limit = 12, offset = 0 } = req.query;
      
      let query = `
        SELECT l.*, COALESCE(u.name, 'Campus Seller') as seller_name 
        FROM listings l 
        LEFT JOIN users u ON l.seller_id = u.id
      `;
      
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

      if (conditions.length > 0) {
        query += " WHERE " + conditions.join(" AND ");
      }

      query += ` ORDER BY l.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(Number(limit), Number(offset));

      const result = await pool.query(query, params);
      res.json(result.rows || []);

    } catch (err: any) {
      console.error('DATABASE ERROR:', err.message);
      res.status(200).json([]); 
    }
  });

  // 2. Get Single Listing (NEW: Fixes the blank page issue)
  app.get('/api/listings/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const result = await pool.query(`
        SELECT l.*, COALESCE(u.name, 'Campus Seller') as seller_name 
        FROM listings l 
        LEFT JOIN users u ON l.seller_id = u.id 
        WHERE l.id = $1
      `, [id]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Listing not found' });
      }
      res.json(result.rows[0]);
    } catch (err: any) {
      console.error('Error fetching single listing:', err.message);
      res.status(500).json({ error: 'Server error' });
    }
  });

  // 3. Create Listing
  app.post('/api/listings', authenticate, upload.single('image'), async (req: any, res) => {
    try {
      const { title, description, price, category } = req.body;
      let image_url = req.body.image_url;

      if (req.file) {
        const file = req.file;
        const fileName = `${Date.now()}-${file.originalname.replace(/\s/g, '_')}`;
        
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
      console.error('Upload Error:', err);
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

  // --- Profile Stub Routes ---
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
        WHERE m.sender_id = $1 OR m.receiver_id = $1
        ORDER BY m.created_at DESC`, [req.user.id]);
      res.json(result.rows || []);
    } catch (err) {
      res.status(500).json([]);
    }
  });

  // --- Production Serving ---
  const PORT = process.env.PORT || 3000;
  
  if (process.env.NODE_ENV === 'production') {
    // Robust path for Railway
    const distPath = path.resolve(process.cwd(), 'frontend/dist');
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