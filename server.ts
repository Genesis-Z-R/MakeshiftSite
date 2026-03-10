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

dotenv.config();

// --- 1. File Upload Configuration ---
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

  // --- 2. Robust CORS Configuration ---
  const allowedOrigins = [
    process.env.FRONTEND_URL,
    'https://makeshift-site.vercel.app',
    'https://makeshiftsite-production.up.railway.app',
    /\.vercel\.app$/ 
  ];

  app.use(cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.some(p => p instanceof RegExp ? p.test(origin) : p === origin)) {
        callback(null, true);
      } else {
        callback(new Error('CORS blocked by server'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }));

  app.use(express.json());
  app.use('/uploads', express.static(UPLOADS_DIR));

  // --- 3. Socket.io for Real-time Chat ---
  const io = new Server(httpServer, {
    cors: { origin: true, methods: ["GET", "POST"], credentials: true }
  });

  const userSockets = new Map<string, string>();

  io.on('connection', (socket) => {
    socket.on('authenticate', (userId: string) => {
      userSockets.set(userId, socket.id);
    });

    socket.on('send_message', (data) => {
      const receiverSocketId = userSockets.get(data.receiver_id);
      if (receiverSocketId) io.to(receiverSocketId).emit('new_message', data);
    });

    socket.on('disconnect', () => {
      for (const [userId, socketId] of userSockets.entries()) {
        if (socketId === socket.id) userSockets.delete(userId);
      }
    });
  });

  // --- 4. Auth Middleware (Supabase JWT/UUID Support) ---
  const authenticate = async (req: any, res: any, next: any) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    
    try {
      const decoded: any = jwt.decode(token);
      if (!decoded || !decoded.sub) return res.status(401).json({ error: 'Invalid token' });
      
      req.user = {
        id: decoded.sub, // This is the UUID string
        email: decoded.email
      };
      next();
    } catch (err) {
      res.status(401).json({ error: 'Invalid token' });
    }
  };

  // --- 5. Listings Routes ---
  app.get('/api/listings', async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT l.*, u.name AS seller_name 
        FROM listings l
        JOIN users u ON l.seller_id = u.id
        WHERE l.status = 'available'
        ORDER BY l.created_at DESC
      `);
      res.json(result.rows || []);
    } catch (err) {
      console.error('Listings Fetch Error:', err);
      res.status(500).json([]); // Returns array to prevent frontend .map crash
    }
  });

 app.post('/api/listings', authenticate, upload.single('image'), async (req: any, res) => {
  const { title, description, price, category } = req.body;
  
  // Use the UUID from the decoded JWT
  const seller_id = req.user.id; 
  
  // Convert price to a number so PostgreSQL 'numeric' type is happy
  const numericPrice = parseFloat(price);

  // If a file was uploaded, use the local path; otherwise, use the URL string
  const image_url = req.file ? `/uploads/${req.file.filename}` : req.body.image_url;

  try {
    await pool.query(
      'INSERT INTO listings (seller_id, title, description, price, category, image_url, status) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [seller_id, title, description, numericPrice, category, image_url, 'available']
    );
    res.json({ success: true });
  } catch (err: any) {
    console.error('Listing Post Error:', err.message);
    res.status(500).json({ error: 'Failed to create listing. Check server logs.' });
  }
});
  // --- 6. Cart & Checkout Routes (Fixes HTML response error) ---
  app.get('/api/cart', authenticate, async (req: any, res) => {
    try {
      const result = await pool.query(`
        SELECT c.id, l.id as listing_id, l.title, l.price, l.image_url 
        FROM cart c
        JOIN listings l ON c.listing_id = l.id
        WHERE c.user_id = $1
      `, [req.user.id]);
      res.json(result.rows || []);
    } catch (err) {
      console.error('Cart Fetch Error:', err);
      res.status(500).json([]);
    }
  });

  app.post('/api/cart', authenticate, async (req: any, res) => {
    const { listing_id } = req.body;
    try {
      await pool.query('INSERT INTO cart (user_id, listing_id) VALUES ($1, $2)', [req.user.id, listing_id]);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Failed to add to cart' });
    }
  });

  app.delete('/api/cart/:id', authenticate, async (req: any, res) => {
    try {
      await pool.query('DELETE FROM cart WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Failed to remove from cart' });
    }
  });

  app.post('/api/checkout', authenticate, async (req: any, res) => {
    try {
      // Logic: Clear user's cart upon checkout
      await pool.query('DELETE FROM cart WHERE user_id = $1', [req.user.id]);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Checkout failed' });
    }
  });

  // --- 7. Messages & Reports Routes ---
  app.get('/api/messages', authenticate, async (req: any, res) => {
    try {
      const result = await pool.query(`
        SELECT m.*, l.title as listing_title, 
               u1.name as sender_name, u2.name as receiver_name
        FROM messages m
        JOIN listings l ON m.listing_id = l.id
        JOIN users u1 ON m.sender_id = u1.id
        JOIN users u2 ON m.receiver_id = u2.id
        WHERE m.sender_id = $1 OR m.receiver_id = $1
        ORDER BY m.created_at DESC
      `, [req.user.id]);
      res.json(result.rows || []);
    } catch (err) {
      console.error('Messages Error:', err);
      res.status(500).json([]);
    }
  });

  app.post('/api/reports', authenticate, async (req: any, res) => {
    const { reported_id, reason } = req.body;
    try {
      await pool.query(
        'INSERT INTO reports (reporter_id, reported_id, reason) VALUES ($1, $2, $3)',
        [req.user.id, reported_id, reason]
      );
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Failed to submit report' });
    }
  });

  // --- 8. Production Config & SPAs ---
  const PORT = process.env.PORT || 3000;
  if (process.env.NODE_ENV === 'production') {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    // Catch-all for React Router - must stay at the bottom
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
