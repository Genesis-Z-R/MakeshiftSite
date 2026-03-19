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

const UPLOADS_DIR = process.env.UPLOADS_PATH || path.join(process.cwd(), 'uploads');

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const upload = multer({ storage: multer.memoryStorage() });

// Simple in-memory error log for the Admin Dashboard
const systemErrors: { timestamp: string; message: string; path?: string }[] = [];

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  
  const io = new Server(httpServer, {
    cors: {
      origin: ["https://makeshift-site.vercel.app", "http://localhost:5173", /\.vercel\.app$/],
      methods: ["GET", "POST"],
      credentials: true
    },
    transports: ['websocket', 'polling'],
    allowEIO3: true
  });

  // Track online users using STRING IDs (Supabase UUIDs)
  const userSockets = new Map<string, string>();
  const socketUsers = new Map<string, string>();

  const broadcastOnlineUsers = () => {
    const onlineUserIds = Array.from(userSockets.keys());
    io.emit('online_users', onlineUserIds);
  };

  // --- SOCKET.IO LOGIC ---
  io.on('connection', (socket) => {
    socket.on('authenticate', (userId: string) => {
      userSockets.set(userId, socket.id);
      socketUsers.set(socket.id, userId);
      broadcastOnlineUsers();
    });

    socket.on('send_message', (data) => {
      const receiverSocketId = userSockets.get(data.receiver_id);
      const senderSocketId = userSockets.get(data.sender_id);
      
      if (receiverSocketId) io.to(receiverSocketId).emit('new_message', data);
      if (senderSocketId) io.to(senderSocketId).emit('new_message', data);
    });

    socket.on('typing', (data) => {
      const receiverSocketId = userSockets.get(data.receiver_id);
      if (receiverSocketId) io.to(receiverSocketId).emit('typing', data);
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

  app.use(cors({
    origin: ["https://makeshift-site.vercel.app", "http://localhost:5173", /\.vercel\.app$/],
    credentials: true
  }));
  app.use(express.json());

  // Error logging middleware for Admin Stats
  app.use((req, res, next) => {
    const originalJson = res.json;
    res.json = function(data) {
      if (res.statusCode >= 400) {
        systemErrors.unshift({
          timestamp: new Date().toISOString(),
          message: data?.error || 'Unknown error',
          path: req.path
        });
        if (systemErrors.length > 50) systemErrors.pop();
      }
      return originalJson.call(this, data);
    };
    next();
  });

  // --- SUPABASE AUTHENTICATION MIDDLEWARE ---
  const authenticate = (req: any, res: any, next: any) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    
    try {
      // Decode the Supabase token without verifying against a local secret
      const decoded: any = jwt.decode(token); 
      if (!decoded) return res.status(401).json({ error: 'Invalid token' });
      
      req.user = { 
        id: decoded.sub || decoded.id, 
        email: decoded.email,
        role: decoded.user_metadata?.role || decoded.role || 'student'
      };
      next();
    } catch (err) {
      res.status(401).json({ error: 'Invalid token' });
    }
  };

  // --- LISTING ROUTES ---
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
      res.status(200).json([]); 
    }
  });

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
      res.status(500).json({ error: 'Failed' });
    }
  });

  // --- CART & CHECKOUT ROUTES ---
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

  app.post('/api/checkout', authenticate, async (req: any, res) => {
    const client = await pool.connect();
    try {
      const cartItemsResult = await client.query(`
        SELECT cart_items.*, listings.price, listings.status
        FROM cart_items JOIN listings ON cart_items.listing_id = listings.id
        WHERE cart_items.user_id = $1
      `, [req.user.id]);

      const cartItems = cartItemsResult.rows;
      if (cartItems.length === 0) return res.status(400).json({ error: 'Cart is empty' });

      await client.query('BEGIN');
      for (const item of cartItems) {
        if (item.status !== 'available') throw new Error(`Item ${item.listing_id} is no longer available`);
        await client.query('INSERT INTO transactions (buyer_id, listing_id, amount) VALUES ($1, $2, $3)', [req.user.id, item.listing_id, item.price]);
        await client.query("UPDATE listings SET sold_count = sold_count + 1, status = 'sold' WHERE id = $1", [item.listing_id]);
      }
      await client.query('DELETE FROM cart_items WHERE user_id = $1', [req.user.id]);
      await client.query('COMMIT');
      res.json({ success: true });
    } catch (err: any) {
      await client.query('ROLLBACK');
      res.status(400).json({ error: err.message });
    } finally {
      client.release();
    }
  });

  app.get('/api/transactions', authenticate, async (req: any, res) => {
    try {
      const result = await pool.query(`
        SELECT transactions.*, listings.title, listings.image_url
        FROM transactions JOIN listings ON transactions.listing_id = listings.id
        WHERE transactions.buyer_id = $1 ORDER BY transactions.created_at DESC
      `, [req.user.id]);
      res.json(result.rows);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch transactions' });
    }
  });

  // --- MESSAGES ROUTES ---
  app.get('/api/messages', authenticate, async (req: any, res) => {
    try {
      const result = await pool.query(`
        SELECT DISTINCT ON (other_user_id, listing_id)
          m.id, m.content, m.created_at, m.listing_id, l.title as listing_title,
          CASE WHEN m.sender_id = $1 THEN m.receiver_id ELSE m.sender_id END as other_user_id,
          CASE WHEN m.sender_id = $1 THEN u2.name ELSE u1.name END as other_user_name
        FROM messages m
        JOIN listings l ON m.listing_id = l.id
        JOIN users u1 ON m.sender_id = u1.id
        JOIN users u2 ON m.receiver_id = u2.id
        WHERE m.sender_id = $1 OR m.receiver_id = $1
        ORDER BY other_user_id, listing_id, m.created_at DESC
      `, [req.user.id]);
      res.json(result.rows || []);
    } catch (err) {
      res.status(500).json([]);
    }
  });

  app.get('/api/messages/:otherUserId', authenticate, async (req: any, res) => {
    try {
      const result = await pool.query(`
        SELECT m.*, u1.name as sender_name, u2.name as receiver_name
        FROM messages m
        JOIN users u1 ON m.sender_id = u1.id
        JOIN users u2 ON m.receiver_id = u2.id
        WHERE ((m.sender_id = $1 AND m.receiver_id = $2) OR (m.sender_id = $2 AND m.receiver_id = $1)) AND m.listing_id = $3
        ORDER BY m.created_at ASC`, 
        [req.user.id, req.params.otherUserId, req.query.listing_id]
      );
      res.json(result.rows || []);
    } catch (err) {
      res.status(500).json([]);
    }
  });

  app.post('/api/messages', authenticate, async (req: any, res) => {
    try {
      const result = await pool.query(
        'INSERT INTO messages (sender_id, receiver_id, listing_id, content) VALUES ($1, $2, $3, $4) RETURNING *',
        [req.user.id, req.body.receiver_id, req.body.listing_id, req.body.content]
      );
      res.json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: 'Failed to send' });
    }
  });

  // --- ADMIN & REPORT ROUTES ---
  app.get('/api/admin/stats', authenticate, async (req: any, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    try {
      const [usersRes, listingsRes, messagesRes, transRes, reportsRes] = await Promise.all([
        pool.query('SELECT COUNT(*) as count FROM users'),
        pool.query('SELECT COUNT(*) as count FROM listings'),
        pool.query('SELECT COUNT(*) as count FROM messages'),
        pool.query('SELECT COUNT(*) as count FROM transactions'),
        pool.query("SELECT COUNT(*) as count FROM reports WHERE status = 'pending'")
      ]);

      res.json({
        totalUsers: parseInt(usersRes.rows[0].count),
        totalListings: parseInt(listingsRes.rows[0].count),
        totalMessages: parseInt(messagesRes.rows[0].count),
        totalTransactions: parseInt(transRes.rows[0].count),
        totalReports: parseInt(reportsRes.rows[0].count),
        onlineUsers: userSockets.size,
        recentErrors: systemErrors.slice(0, 10)
      });
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch stats' });
    }
  });

  app.get('/api/admin/users', authenticate, async (req: any, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    try {
      const result = await pool.query('SELECT id, name, email, role, created_at FROM users');
      res.json(result.rows);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  });

  app.delete('/api/admin/users/:id', authenticate, async (req: any, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    try {
      await pool.query('DELETE FROM users WHERE id = $1', [req.params.id]);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Failed to delete user' });
    }
  });

  app.post('/api/reports', authenticate, async (req: any, res) => {
    try {
      await pool.query('INSERT INTO reports (reporter_id, reported_id, reason) VALUES ($1, $2, $3)', [req.user.id, req.body.reported_id, req.body.reason]);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Failed to submit report' });
    }
  });

  app.get('/api/admin/reports', authenticate, async (req: any, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    try {
      const result = await pool.query(`
        SELECT reports.*, u1.name as reporter_name, u2.name as reported_name 
        FROM reports JOIN users u1 ON reports.reporter_id = u1.id JOIN users u2 ON reports.reported_id = u2.id 
        ORDER BY created_at DESC
      `);
      res.json(result.rows);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch reports' });
    }
  });

  app.post('/api/admin/reports/:id/resolve', authenticate, async (req: any, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    try {
      await pool.query("UPDATE reports SET status = 'resolved' WHERE id = $1", [req.params.id]);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Failed to resolve report' });
    }
  });

  app.post('/api/admin/warnings', authenticate, async (req: any, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    try {
      await pool.query('INSERT INTO warnings (user_id, admin_id, message) VALUES ($1, $2, $3)', [req.body.user_id, req.user.id, req.body.message]);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Failed to issue warning' });
    }
  });

  app.get('/api/warnings', authenticate, async (req: any, res) => {
    try {
      const result = await pool.query(`
        SELECT w.*, u.name as admin_name 
        FROM warnings w 
        JOIN users u ON w.admin_id = u.id 
        WHERE w.user_id = $1 
        ORDER BY w.created_at DESC
      `, [req.user.id]);
      res.json(result.rows || []);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch warnings' });
    }
  });

  // --- STUBS ---
  app.get('/api/users/:id', async (req, res) => {
    try {
      const result = await pool.query('SELECT id, name, email, avatar_url FROM users WHERE id = $1', [req.params.id]);
      res.json(result.rows[0] || { name: 'Campus Seller' });
    } catch (err) {
      res.json({ name: 'Campus Seller' });
    }
  });

  // --- PRODUCTION SERVING ---
  const PORT = process.env.PORT || 3000;
  if (process.env.NODE_ENV === 'production') {
    const distPath = path.resolve(process.cwd(), 'dist'); 
    app.use(express.static(distPath));
    app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }

  httpServer.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));
}

startServer();