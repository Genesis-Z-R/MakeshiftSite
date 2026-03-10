import express from 'express';
import cors from 'cors';
import { createServer as createViteServer } from 'vite';
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

  // --- 1. Robust CORS Configuration ---
  const frontendUrl = process.env.FRONTEND_URL;
  const allowedOrigins = [
    frontendUrl,
    'https://makeshift-site.vercel.app',
    /\.vercel\.app$/ // Matches all Vercel deployment/preview URLs
  ];

  const corsOptions: cors.CorsOptions = {
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const isAllowed = allowedOrigins.some(pattern => 
        pattern instanceof RegExp ? pattern.test(origin) : pattern === origin
      );
      if (isAllowed) callback(null, true);
      else callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  };

  app.use(cors(corsOptions));
  app.use(express.json());
  app.use('/uploads', express.static(UPLOADS_DIR));

  // --- 2. Socket.io with Shared CORS ---
  const io = new Server(httpServer, {
    cors: { origin: true, methods: ["GET", "POST"], credentials: true }
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
      if (receiverSocketId) io.to(receiverSocketId).emit('new_message', data);
    });

    socket.on('disconnect', () => {
      const userId = socketUsers.get(socket.id);
      if (userId) { userSockets.delete(userId); socketUsers.delete(socket.id); }
    });
  });

  // --- 3. Updated Auth Middleware (UUID support) ---
  const authenticate = async (req: any, res: any, next: any) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    
    try {
      // Decode Supabase JWT - 'sub' is the UUID string
      const decoded: any = jwt.decode(token);
      if (!decoded || !decoded.sub) return res.status(401).json({ error: 'Invalid token' });
      
      req.user = {
        id: decoded.sub, 
        email: decoded.email,
        role: decoded.user_metadata?.role || 'student'
      };
      next();
    } catch (err) {
      res.status(401).json({ error: 'Invalid token' });
    }
  };

  // --- 4. Simplified Routes ---
  // Notice: /api/auth/sync is REMOVED. Database trigger handles this now.

  app.get('/api/listings', async (req, res) => {
    try {
      const result = await pool.query('SELECT * FROM listings WHERE status = $1 ORDER BY created_at DESC', ['available']);
      res.json(result.rows);
    } catch (err) {
      res.status(500).json({ error: 'Database error' });
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
    } catch (err) {
      res.status(500).json({ error: 'Failed to create listing' });
    }
  });

  // --- 5. Production Serving ---
  const PORT = process.env.PORT || 3000;
  if (process.env.NODE_ENV === 'production') {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();