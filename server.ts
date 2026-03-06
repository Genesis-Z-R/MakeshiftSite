import express from 'express';
import { createServer as createViteServer } from 'vite';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import db from './db';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'campus-secret-key';

// Simple in-memory error log for monitoring
const systemErrors: { timestamp: string; message: string; path?: string }[] = [];

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  const PORT = 3000;

  // Track online users
  const userSockets = new Map<number, string>(); // userId -> socketId

  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);
    
    socket.on('authenticate', (userId: number) => {
      userSockets.set(userId, socket.id);
      console.log(`User ${userId} authenticated on socket ${socket.id}`);
    });

    socket.on('send_message', (data: { receiver_id: number; sender_id: number; content: string; listing_id: number }) => {
      const receiverSocketId = userSockets.get(data.receiver_id);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('new_message', data);
      }
    });

    socket.on('disconnect', () => {
      for (const [userId, socketId] of userSockets.entries()) {
        if (socketId === socket.id) {
          userSockets.delete(userId);
          break;
        }
      }
      console.log('User disconnected:', socket.id);
    });
  });

  // --- Seed Data ---
  const seedData = () => {
    try {
      const userCount: any = db.prepare('SELECT COUNT(*) as count FROM users').get();
      const listingCount: any = db.prepare('SELECT COUNT(*) as count FROM listings').get();
      
      if (userCount.count === 0 || listingCount.count === 0) {
        console.log('Seeding database...');
        if (userCount.count === 0) {
          const hashedPassword = bcrypt.hashSync('password123', 10);
          db.prepare('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)').run(
            'Admin User', 'admin@campus.edu', hashedPassword, 'admin'
          );
          db.prepare('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)').run(
            'Jane Student', 'jane@campus.edu', hashedPassword, 'student'
          );
        }

        const listings = [
          ['Calculus Early Transcendentals', 'Like new condition, no highlights.', 45.00, 'Textbooks', 'https://picsum.photos/seed/book1/400/400'],
          ['Sony WH-1000XM4 Headphones', 'Noise cancelling, 1 year old.', 180.00, 'Electronics', 'https://picsum.photos/seed/headphones/400/400'],
          ['Dorm Desk Lamp', 'LED with USB charging port.', 15.00, 'Furniture', 'https://picsum.photos/seed/lamp/400/400'],
          ['University Hoodie', 'Size Medium, barely worn.', 25.00, 'Clothing', 'https://picsum.photos/seed/hoodie/400/400']
        ];

        if (listingCount.count === 0) {
          listings.forEach(([title, desc, price, cat, img]) => {
            db.prepare('INSERT INTO listings (seller_id, title, description, price, category, image_url) VALUES (1, ?, ?, ?, ?, ?)').run(
              title, desc, price, cat, img
            );
          });
        }
        console.log('Database seeded successfully.');
      }
    } catch (err) {
      console.error('Seeding error:', err);
    }
  };
  seedData();

  app.use(express.json());

  // Error logging middleware
  app.use((req, res, next) => {
    const originalJson = res.json;
    res.json = function(data) {
      if (res.statusCode >= 400) {
        systemErrors.unshift({
          timestamp: new Date().toISOString(),
          message: data.error || 'Unknown error',
          path: req.path
        });
        if (systemErrors.length > 50) systemErrors.pop();
      }
      return originalJson.call(this, data);
    };
    next();
  });

  // --- Auth Routes ---
  app.post('/api/auth/register', async (req, res) => {
    const { name, email, password, adminPassword } = req.body;
    try {
      const userCount: any = db.prepare('SELECT COUNT(*) as count FROM users').get();
      let role = 'student';
      if (adminPassword === 'Genesis@6112') {
        role = 'admin';
      } else if (userCount.count === 0) {
        role = 'admin';
      }
      const hashedPassword = await bcrypt.hash(password, 10);
      const info = db.prepare('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)').run(name, email, hashedPassword, role);
      const token = jwt.sign({ id: info.lastInsertRowid, email, role }, JWT_SECRET);
      res.json({ token, user: { id: info.lastInsertRowid, name, email, role } });
    } catch (err: any) {
      res.status(400).json({ error: 'Email already exists or invalid data' });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    const user: any = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET);
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  });

  // Middleware to verify JWT
  const authenticate = (req: any, res: any, next: any) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    try {
      req.user = jwt.verify(token, JWT_SECRET);
      next();
    } catch (err) {
      res.status(401).json({ error: 'Invalid token' });
    }
  };

  // --- Listing Routes ---
  app.get('/api/listings', (req, res) => {
    const { search, category, sort } = req.query;
    let query = "SELECT listings.*, users.name as seller_name FROM listings JOIN users ON listings.seller_id = users.id WHERE status = 'available'";
    const params: any[] = [];

    if (search) {
      query += ' AND (title LIKE ? OR description LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    if (category && category !== 'All') {
      query += ' AND category = ?';
      params.push(category);
    }

    if (sort === 'price_low') query += ' ORDER BY price ASC';
    else if (sort === 'price_high') query += ' ORDER BY price DESC';
    else query += ' ORDER BY created_at DESC';

    const listings = db.prepare(query).all(...params);
    res.json(listings);
  });

  app.get('/api/listings/:id', (req, res) => {
    const listing = db.prepare('SELECT listings.*, users.name as seller_name, users.email as seller_email FROM listings JOIN users ON listings.seller_id = users.id WHERE listings.id = ?').get(req.params.id);
    if (!listing) return res.status(404).json({ error: 'Listing not found' });
    res.json(listing);
  });

  app.post('/api/listings', authenticate, (req: any, res) => {
    const { title, description, price, category, image_url } = req.body;
    const info = db.prepare('INSERT INTO listings (seller_id, title, description, price, category, image_url) VALUES (?, ?, ?, ?, ?, ?)').run(req.user.id, title, description, price, category, image_url);
    res.json({ id: info.lastInsertRowid });
  });

  app.put('/api/listings/:id', authenticate, (req: any, res) => {
    const { title, description, price, category, image_url, status } = req.body;
    const listing: any = db.prepare('SELECT * FROM listings WHERE id = ?').get(req.params.id);
    if (!listing || listing.seller_id !== req.user.id) return res.status(403).json({ error: 'Unauthorized' });

    db.prepare('UPDATE listings SET title = ?, description = ?, price = ?, category = ?, image_url = ?, status = ? WHERE id = ?')
      .run(title, description, price, category, image_url, status, req.params.id);
    res.json({ success: true });
  });

  app.delete('/api/listings/:id', authenticate, (req: any, res) => {
    const listing: any = db.prepare('SELECT * FROM listings WHERE id = ?').get(req.params.id);
    if (!listing) return res.status(404).json({ error: 'Not found' });
    if (listing.seller_id !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: 'Unauthorized' });

    db.prepare('DELETE FROM listings WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  });

  // --- Message Routes ---
  app.post('/api/messages', authenticate, (req: any, res) => {
    const { receiver_id, listing_id, content } = req.body;
    db.prepare('INSERT INTO messages (sender_id, receiver_id, listing_id, content) VALUES (?, ?, ?, ?)').run(req.user.id, receiver_id, listing_id, content);
    res.json({ success: true });
  });

  app.get('/api/messages', authenticate, (req: any, res) => {
    const messages = db.prepare(`
      SELECT messages.*, u1.name as sender_name, u2.name as receiver_name, listings.title as listing_title
      FROM messages
      JOIN users u1 ON messages.sender_id = u1.id
      JOIN users u2 ON messages.receiver_id = u2.id
      JOIN listings ON messages.listing_id = listings.id
      WHERE sender_id = ? OR receiver_id = ?
      ORDER BY created_at DESC
    `).all(req.user.id, req.user.id);
    res.json(messages);
  });

  // --- Admin Routes ---
  app.get('/api/admin/users', authenticate, (req: any, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    const users = db.prepare('SELECT id, name, email, role, created_at FROM users').all();
    res.json(users);
  });

  app.delete('/api/admin/users/:id', authenticate, (req: any, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  });

  app.get('/api/admin/stats', authenticate, (req: any, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    
    const totalUsers: any = db.prepare('SELECT COUNT(*) as count FROM users').get();
    const totalListings: any = db.prepare('SELECT COUNT(*) as count FROM listings').get();
    const totalMessages: any = db.prepare('SELECT COUNT(*) as count FROM messages').get();
    const totalTransactions: any = db.prepare('SELECT COUNT(*) as count FROM transactions').get();

    res.json({
      totalUsers: totalUsers.count,
      totalListings: totalListings.count,
      totalMessages: totalMessages.count,
      totalTransactions: totalTransactions.count,
      onlineUsers: userSockets.size,
      recentErrors: systemErrors.slice(0, 10)
    });
  });

  // --- Cart Routes ---
  app.get('/api/cart', authenticate, (req: any, res) => {
    const items = db.prepare(`
      SELECT cart_items.*, listings.title, listings.price, listings.image_url, listings.status
      FROM cart_items
      JOIN listings ON cart_items.listing_id = listings.id
      WHERE cart_items.user_id = ?
    `).all(req.user.id);
    res.json(items);
  });

  app.get('/api/transactions', authenticate, (req: any, res) => {
    const transactions = db.prepare(`
      SELECT transactions.*, listings.title, listings.image_url
      FROM transactions
      JOIN listings ON transactions.listing_id = listings.id
      WHERE transactions.buyer_id = ?
      ORDER BY transactions.created_at DESC
    `).all(req.user.id);
    res.json(transactions);
  });

  app.post('/api/cart', authenticate, (req: any, res) => {
    const { listing_id } = req.body;
    try {
      db.prepare('INSERT INTO cart_items (user_id, listing_id) VALUES (?, ?)').run(req.user.id, listing_id);
      res.json({ success: true });
    } catch (err) {
      res.status(400).json({ error: 'Item already in cart' });
    }
  });

  app.delete('/api/cart/:id', authenticate, (req: any, res) => {
    db.prepare('DELETE FROM cart_items WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
    res.json({ success: true });
  });

  // --- Checkout Route ---
  app.post('/api/checkout', authenticate, (req: any, res) => {
    const cartItems: any[] = db.prepare(`
      SELECT cart_items.*, listings.price, listings.status
      FROM cart_items
      JOIN listings ON cart_items.listing_id = listings.id
      WHERE cart_items.user_id = ?
    `).all(req.user.id);

    if (cartItems.length === 0) return res.status(400).json({ error: 'Cart is empty' });

    const transaction = db.transaction(() => {
      for (const item of cartItems) {
        if (item.status !== 'available') {
          throw new Error(`Item ${item.listing_id} is no longer available`);
        }
        // Create transaction
        db.prepare('INSERT INTO transactions (buyer_id, listing_id, amount) VALUES (?, ?, ?)').run(req.user.id, item.listing_id, item.price);
        // Mark listing as sold
        db.prepare("UPDATE listings SET status = 'sold' WHERE id = ?").run(item.listing_id);
      }
      // Clear cart
      db.prepare('DELETE FROM cart_items WHERE user_id = ?').run(req.user.id);
    });

    try {
      transaction();
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
