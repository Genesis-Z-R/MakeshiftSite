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

  // --- 1. CORS Setup ---
  const allowedOrigins = [
    process.env.FRONTEND_URL,
    'https://makeshift-site.vercel.app',
    /\.vercel\.app$/ 
  ];

  app.use(cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.some(p => p instanceof RegExp ? p.test(origin) : p === origin)) {
        callback(null, true);
      } else {
        callback(new Error('CORS blocked'));
      }
    },
    credentials: true
  }));

  app.use(express.json());
  app.use('/uploads', express.static(UPLOADS_DIR));

  // --- 2. Socket.io ---
  const io = new Server(httpServer, {
    cors: { origin: true, methods: ["GET", "POST"], credentials: true }
  });

  const userSockets = new Map<string, string>();

  io.on('connection', (socket) => {
    socket.on('authenticate', (userId: string) => {
      userSockets.set(userId, socket.id);
    });
    socket.on('disconnect', () => {
      for (const [userId, socketId] of userSockets.entries()) {
        if (socketId === socket.id) userSockets.delete(userId);
      }
    });
  });

  // --- 3. Auth Middleware ---
  const authenticate = async (req: any, res: any, next: any) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    try {
      const decoded: any = jwt.decode(token);
      if (!decoded?.sub) return res.status(401).json({ error: 'Invalid token' });
      req.user = { id: decoded.sub, email: decoded.email };
      next();
    } catch (err) { res.status(401).json({ error: 'Invalid token' }); }
  };

  // --- 4. Listings Routes ---
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
      console.error(err);
      res.status(500).json([]); // Prevent frontend crash
    }
  });

  app.post('/api/listings', authenticate, upload.single('image'), async (req: any, res) => {
    const { title, description, price, category } = req.body;
    const image_url = req.file ? `/uploads/${req.file.filename}` : req.body.image_url;
    try {
      await pool.query(
        'INSERT INTO listings (seller_id, title, description, price, category, image_url) VALUES ($1, $2, $3, $4, $5, $6)',
        [req.user.id, title, description, price, category, image_url]
      );
      res.json({ success: true });
    } catch (err) { res.status(500).json({ error: 'Failed to create' }); }
  });

  // --- 5. New: Messages Route (Fixes forEach error) ---
  app.get('/api/messages/:otherUserId', authenticate, async (req: any, res) => {
    try {
      const result = await pool.query(`
        SELECT * FROM messages 
        WHERE (sender_id = $1 AND receiver_id = $2)
           OR (sender_id = $2 AND receiver_id = $1)
        ORDER BY created_at ASC
      `, [req.user.id, req.params.otherUserId]);
      res.json(result.rows || []); // Ensure array
    } catch (err) {
      res.status(500).json([]); 
    }
  });

  // --- 6. Production Config ---
  const PORT = process.env.PORT || 3000;
  if (process.env.NODE_ENV === 'production') {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }

  httpServer.listen(PORT, '0.0.0.0', () => console.log(`Server on ${PORT}`));
}

startServer();