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
  
  
 // Define your trusted frontend URLs here
  const allowedOrigins = [
    "https://campusmarket1.store",
    "https://www.campusmarket1.store",
    "https://makeshift-site.vercel.app",
    "http://localhost:5173",
    /\.vercel\.app$/ // Keeps support for Vercel branch previews
  ];

  const io = new Server(httpServer, {
    cors: {
      origin: allowedOrigins,
      methods: ["GET", "POST"],
      credentials: true
    },
    transports: ['websocket', 'polling'],
    allowEIO3: true
  });

  // Track online users
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
    origin: allowedOrigins,
    credentials: true
  }));
  app.use(express.json());

  // Error logging middleware
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

  // --- AUTH MIDDLEWARE ---
  const authenticate = (req: any, res: any, next: any) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    try {
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

  const requireAdmin = async (req: any, res: any, next: any) => {
    try {
      const result = await pool.query('SELECT role FROM users WHERE id = $1', [req.user.id]);
      if (result.rows[0]?.role !== 'admin') {
        return res.status(403).json({ error: 'Forbidden: Admin access required.' });
      }
      next();
    } catch (err) {
      console.error("Require Admin Error:", err);
      res.status(500).json({ error: 'Failed to verify admin status' });
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
    } catch (err) {
      console.error("GET Listings Error:", err);
      res.status(500).json([]); 
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
      console.error("GET Listing Detail Error:", err);
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.post('/api/listings', authenticate, upload.single('image'), async (req: any, res) => {
    try {
      const { title, description, price, category } = req.body;
      let image_url = '';
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
      console.error("POST Listing Error:", err);
      res.status(500).json({ error: 'Failed to create listing' });
    }
  });

  app.put('/api/listings/:id', authenticate, upload.single('image'), async (req: any, res) => {
    const { title, description, price, category, status } = req.body;
    try {
      const listingResult = await pool.query('SELECT * FROM listings WHERE id = $1', [req.params.id]);
      const listing = listingResult.rows[0];
      
      if (!listing) return res.status(404).json({ error: 'Not found' });
      if (listing.seller_id !== req.user.id) return res.status(403).json({ error: 'Unauthorized' });

      let image_url = listing.image_url;
      if (req.file) {
        const fileName = `${Date.now()}-${req.file.originalname.replace(/\s/g, '_')}`;
        const { error: storageError } = await supabase.storage.from('listing-images').upload(fileName, req.file.buffer, { contentType: req.file.mimetype });
        if (storageError) throw storageError;
        const { data: publicUrlData } = supabase.storage.from('listing-images').getPublicUrl(fileName);
        image_url = publicUrlData.publicUrl;
      }

      await pool.query(
        'UPDATE listings SET title = $1, description = $2, price = $3, category = $4, image_url = $5, status = $6 WHERE id = $7',
        [
          title || listing.title, 
          description || listing.description, 
          price ? parseFloat(price) : listing.price, 
          category || listing.category, 
          image_url, 
          status || listing.status, 
          req.params.id
        ]
      );
      res.json({ success: true });
    } catch (err) {
      console.error("PUT Listing Error:", err);
      res.status(500).json({ error: 'Failed to update' });
    }
  });

  app.delete('/api/listings/:id', authenticate, async (req: any, res) => {
    try {
      const listingResult = await pool.query('SELECT * FROM listings WHERE id = $1', [req.params.id]);
      const listing = listingResult.rows[0];
      if (!listing) return res.status(404).json({ error: 'Not found' });
      if (listing.seller_id !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: 'Unauthorized' });
      await pool.query('DELETE FROM listings WHERE id = $1', [req.params.id]);
      res.json({ success: true });
    } catch (err) {
      console.error("DELETE Listing Error:", err);
      res.status(500).json({ error: 'Failed' });
    }
  });

  // --- CART, MESSAGES, ADMIN ROUTES ---
  app.get('/api/cart', authenticate, async (req: any, res) => {
    try {
      const result = await pool.query('SELECT c.id as cart_item_id, l.* FROM cart_items c JOIN listings l ON c.listing_id = l.id WHERE c.user_id = $1', [req.user.id]);
      res.json(result.rows || []);
    } catch (err) { 
      console.error("GET Cart Error:", err);
      res.status(500).json([]); 
    }
  });

  app.post('/api/cart', authenticate, async (req: any, res) => {
    try {
      await pool.query('INSERT INTO cart_items (user_id, listing_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [req.user.id, req.body.listing_id]);
      res.json({ success: true });
    } catch (err) { 
      console.error("POST Cart Error:", err);
      res.status(500).json({ error: 'Failed' }); 
    }
  });

  app.delete('/api/cart/:id', authenticate, async (req: any, res) => {
    try {
      await pool.query('DELETE FROM cart_items WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
      res.json({ success: true });
    } catch (err) { 
      console.error("DELETE Cart Error:", err);
      res.status(500).json({ error: 'Failed' }); 
    }
  });

  app.post('/api/checkout', authenticate, async (req: any, res) => {
    const client = await pool.connect();
    try {
      const cartItemsResult = await client.query('SELECT cart_items.*, listings.price, listings.status FROM cart_items JOIN listings ON cart_items.listing_id = listings.id WHERE cart_items.user_id = $1', [req.user.id]);
      const cartItems = cartItemsResult.rows;
      if (cartItems.length === 0) return res.status(400).json({ error: 'Empty' });
      
      await client.query('BEGIN');
      for (const item of cartItems) {
        if (item.status !== 'available') throw new Error(`Item ${item.listing_id} unavailable`);
        await client.query('INSERT INTO transactions (buyer_id, listing_id, amount) VALUES ($1, $2, $3)', [req.user.id, item.listing_id, item.price]);
        
        // This query requires a 'sold_count' column in your 'listings' table! 
        // If it throws an error, you need to run: ALTER TABLE listings ADD COLUMN sold_count INT DEFAULT 0;
        await client.query("UPDATE listings SET sold_count = COALESCE(sold_count, 0) + 1 WHERE id = $1", [item.listing_id]);
      }
      await client.query('DELETE FROM cart_items WHERE user_id = $1', [req.user.id]);
      await client.query('COMMIT');
      res.json({ success: true });
    } catch (err: any) {
      await client.query('ROLLBACK');
      console.error("Checkout Error:", err);
      res.status(400).json({ error: err.message });
    } finally { 
      client.release(); 
    }
  });

  app.get('/api/transactions', authenticate, async (req: any, res) => {
    try {
      const result = await pool.query('SELECT t.*, l.title, l.image_url FROM transactions t JOIN listings l ON t.listing_id = l.id WHERE t.buyer_id = $1 ORDER BY t.created_at DESC', [req.user.id]);
      res.json(result.rows);
    } catch (err) { 
      console.error("GET Transactions Error:", err);
      res.status(500).json({ error: 'Failed' }); 
    }
  });

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
      console.error("GET Messages Error:", err);
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
      console.error("GET Chat Error:", err);
      res.status(500).json([]); 
    }
  });

  app.post('/api/messages', authenticate, async (req: any, res) => {
    try {
      const result = await pool.query(
        'INSERT INTO messages (sender_id, receiver_id, listing_id, content, reply_to_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [req.user.id, req.body.receiver_id, req.body.listing_id, req.body.content, req.body.reply_to_id || null]
      );
      res.json(result.rows[0]);
    } catch (err) { 
      console.error("POST Message Error:", err);
      res.status(500).json({ error: 'Failed' }); 
    }
  });

  app.post('/api/reports', authenticate, async (req: any, res) => {
    try {
      await pool.query('INSERT INTO reports (reporter_id, reported_id, reason) VALUES ($1, $2, $3)', [req.user.id, req.body.reported_id, req.body.reason]);
      res.json({ success: true });
    } catch (err) { 
      console.error("POST Report Error:", err);
      res.status(500).json({ error: 'Failed' }); 
    }
  });

  // --- ADMIN SECTION ---
  app.get('/api/admin/stats', authenticate, requireAdmin, async (req: any, res) => {
    try {
      const [u, l, m, t, r] = await Promise.all([
        pool.query('SELECT COUNT(*) as count FROM users'),
        pool.query('SELECT COUNT(*) as count FROM listings'),
        pool.query('SELECT COUNT(*) as count FROM messages'),
        pool.query('SELECT COUNT(*) as count FROM transactions'),
        pool.query("SELECT COUNT(*) as count FROM reports WHERE status = 'pending'")
      ]);
      res.json({
        totalUsers: parseInt(u.rows[0].count),
        totalListings: parseInt(l.rows[0].count),
        totalMessages: parseInt(m.rows[0].count),
        totalTransactions: parseInt(t.rows[0].count),
        totalReports: parseInt(r.rows[0].count),
        onlineUsers: userSockets.size,
        recentErrors: systemErrors.slice(0, 10)
      });
    } catch (err) { 
      console.error("Admin Stats Error:", err);
      res.status(500).json({ error: 'Failed' }); 
    }
  });

  app.get('/api/admin/users', authenticate, requireAdmin, async (req: any, res) => {
    try {
      const result = await pool.query('SELECT id, name, email, role, created_at FROM users');
      res.json(result.rows);
    } catch (err) { 
      console.error("Admin Users Error:", err);
      res.status(500).json({ error: 'Failed' }); 
    }
  });

  app.delete('/api/admin/users/:id', authenticate, requireAdmin, async (req: any, res) => {
    try {
      await pool.query('DELETE FROM users WHERE id = $1', [req.params.id]);
      res.json({ success: true });
    } catch (err) { 
      console.error("Admin Delete User Error:", err);
      res.status(500).json({ error: 'Failed' }); 
    }
  });

  app.get('/api/admin/reports', authenticate, requireAdmin, async (req: any, res) => {
    try {
      const result = await pool.query('SELECT reports.*, u1.name as reporter_name, u2.name as reported_name FROM reports JOIN users u1 ON reports.reporter_id = u1.id JOIN users u2 ON reports.reported_id = u2.id ORDER BY created_at DESC');
      res.json(result.rows);
    } catch (err) { 
      console.error("Admin Reports Error:", err);
      res.status(500).json({ error: 'Failed' }); 
    }
  });

  app.post('/api/admin/reports/:id/resolve', authenticate, requireAdmin, async (req: any, res) => {
    try {
      await pool.query("UPDATE reports SET status = 'resolved' WHERE id = $1", [req.params.id]);
      res.json({ success: true });
    } catch (err) { 
      console.error("Admin Resolve Report Error:", err);
      res.status(500).json({ error: 'Failed' }); 
    }
  });

  app.post('/api/admin/warnings', authenticate, requireAdmin, async (req: any, res) => {
    try {
      await pool.query('INSERT INTO warnings (user_id, admin_id, message) VALUES ($1, $2, $3)', [req.body.user_id, req.user.id, req.body.message]);
      res.json({ success: true });
    } catch (err) { 
      console.error("Admin Warning Error:", err);
      res.status(500).json({ error: 'Failed' }); 
    }
  });

  app.get('/api/warnings', authenticate, async (req: any, res) => {
    try {
      const result = await pool.query('SELECT w.*, u.name as admin_name FROM warnings w JOIN users u ON w.admin_id = u.id WHERE w.user_id = $1 AND w.created_at > NOW() - INTERVAL \'7 days\' ORDER BY w.created_at DESC', [req.user.id]);
      res.json(result.rows || []);
    } catch (err) { 
      console.error("GET Warnings Error:", err);
      res.status(500).json({ error: 'Failed' }); 
    }
  });

  app.get('/api/users/:id', async (req, res) => {
    try {
      const result = await pool.query('SELECT id, name, email, role, created_at FROM users WHERE id = $1', [req.params.id]);
      if (!result.rows[0]) return res.status(404).json({ error: 'Not found' });
      res.json(result.rows[0]);
    } catch (err) { 
      console.error("GET User ID Error:", err);
      res.status(500).json({ error: 'Failed' }); 
    }
  });

  const PORT = process.env.PORT || 3000;
  if (process.env.NODE_ENV === 'production') {
    const distPath = path.resolve(process.cwd(), 'dist'); 
    app.use(express.static(distPath));
    app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }

  httpServer.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));
}

startServer();