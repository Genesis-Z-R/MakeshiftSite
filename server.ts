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
import axios from 'axios';

dotenv.config();

const UPLOADS_DIR = process.env.UPLOADS_PATH || path.join(process.cwd(), 'uploads');

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage });
const systemErrors: { timestamp: string; message: string; path?: string }[] = [];

async function startServer() {
  const app = express();
  const httpServer = createServer(app);

  // --- CORS Configuration ---
  const frontendUrl = process.env.FRONTEND_URL;
  console.log(`Configuring CORS for Frontend: ${frontendUrl || 'Allowing All'}`);

  const allowedOrigins = [
    frontendUrl,
    'https://makeshift-site.vercel.app',
    /\.vercel\.app$/ // This allows any Vercel preview/deployment URL
  ];

  const corsOptions: cors.CorsOptions = {
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      
      const isAllowed = allowedOrigins.some(pattern => {
        if (!pattern) return false;
        return typeof pattern === 'string' ? pattern === origin : pattern.test(origin);
      });

      if (isAllowed) {
        callback(null, true);
      } else {
        console.warn(`CORS blocked request from: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  };

  // Apply CORS to Express
  app.use(cors(corsOptions));

  // Apply CORS to Socket.io
  const io = new Server(httpServer, {
    cors: {
      origin: true, // Dynamically handle origins based on the request
      methods: ["GET", "POST"],
      credentials: true
    }
  });

  const PORT = process.env.PORT || 3000;

  // --- Socket.io Logic ---
  const userSockets = new Map<string, string>();
  const socketUsers = new Map<string, string>();

  const broadcastOnlineUsers = () => {
    const onlineUserIds = Array.from(userSockets.keys());
    io.emit('online_users', onlineUserIds);
  };

  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);
    
    socket.on('authenticate', (userId: string) => {
      userSockets.set(userId, socket.id);
      socketUsers.set(socket.id, userId);
      broadcastOnlineUsers();
    });

    socket.on('join_room', (roomName: string) => socket.join(roomName));
    socket.on('leave_room', (roomName: string) => socket.leave(roomName));

    socket.on('typing', (data) => {
      const receiverSocketId = userSockets.get(data.receiver_id);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('user_typing', { sender_id: socketUsers.get(socket.id), listing_id: data.listing_id });
      }
    });

    socket.on('send_message', (data) => {
      const receiverSocketId = userSockets.get(data.receiver_id);
      if (receiverSocketId) io.to(receiverSocketId).emit('new_message', data);
      const roomName = `chat_${[data.sender_id, data.receiver_id].sort().join('_')}_${data.listing_id}`;
      socket.to(roomName).emit('new_message', data);
    });

    socket.on('disconnect', () => {
      const userId = socketUsers.get(socket.id);
      if (userId) {
        userSockets.delete(userId);
        socketUsers.delete(socket.id);
        broadcastOnlineUsers();
      }
    });
  });

  // --- Database Seeding ---
  const seedData = async () => {
    try {
      const userCountRes = await pool.query('SELECT COUNT(*) as count FROM users');
      if (parseInt(userCountRes.rows[0].count) === 0) {
        console.log('Seeding initial admin user...');
        await pool.query('INSERT INTO users (id, name, email, role) VALUES ($1, $2, $3, $4)', [
          '00000000-0000-0000-0000-000000000000', 'Admin User', 'admin@campus.edu', 'admin'
        ]);
      }
    } catch (err) {
      console.error('Seeding error:', err);
    }
  };
  await seedData();

  app.use(express.json());
  app.use('/uploads', express.static(UPLOADS_DIR));

  // --- Routes ---
  app.post('/api/auth/sync', async (req, res) => {
    const { id, name, email, role } = req.body;
    try {
      await pool.query(
        'INSERT INTO users (id, name, email, role) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO UPDATE SET name = $2, role = $4',
        [id, name, email, role || 'student']
      );
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Failed to sync user' });
    }
  });

  // (Include all your other routes here - Listings, User, Admin, Reports, Cart, etc.)
  // Note: Keep the 'authenticate' middleware and individual API endpoints you have below

  // --- Production Serving ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
