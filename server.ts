import express from 'express';
import { createServer as createViteServer } from 'vite';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import db from './db';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import axios from 'axios';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'campus-secret-key';
const UPLOADS_DIR = process.env.UPLOADS_PATH || path.join(process.cwd(), 'uploads');

// Ensure uploads directory exists
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
  const socketUsers = new Map<string, number>(); // socketId -> userId

  const broadcastOnlineUsers = () => {
    const onlineUserIds = Array.from(userSockets.keys());
    io.emit('online_users', onlineUserIds);
  };

  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);
    
    socket.on('authenticate', (userId: number) => {
      userSockets.set(userId, socket.id);
      socketUsers.set(socket.id, userId);
      console.log(`User ${userId} authenticated on socket ${socket.id}`);
      broadcastOnlineUsers();
    });

    socket.on('join_room', (roomName: string) => {
      socket.join(roomName);
      console.log(`Socket ${socket.id} joined room ${roomName}`);
    });

    socket.on('leave_room', (roomName: string) => {
      socket.leave(roomName);
      console.log(`Socket ${socket.id} left room ${roomName}`);
    });

    socket.on('typing', (data: { receiver_id: number; listing_id: number }) => {
      const receiverSocketId = userSockets.get(data.receiver_id);
      if (receiverSocketId) {
        const senderId = socketUsers.get(socket.id);
        io.to(receiverSocketId).emit('user_typing', { 
          sender_id: senderId, 
          listing_id: data.listing_id 
        });
      }
    });

    socket.on('stop_typing', (data: { receiver_id: number; listing_id: number }) => {
      const receiverSocketId = userSockets.get(data.receiver_id);
      if (receiverSocketId) {
        const senderId = socketUsers.get(socket.id);
        io.to(receiverSocketId).emit('user_stop_typing', { 
          sender_id: senderId, 
          listing_id: data.listing_id 
        });
      }
    });

    socket.on('send_message', (data: { receiver_id: number; sender_id: number; content: string; listing_id: number }) => {
      const receiverSocketId = userSockets.get(data.receiver_id);
      
      // Emit to specific receiver if online
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('new_message', data);
      }

      // Also emit to the room if they are in one (e.g., "chat_1_2_listing_5")
      // This helps if the user has multiple tabs open
      const roomName = `chat_${Math.min(data.sender_id, data.receiver_id)}_${Math.max(data.sender_id, data.receiver_id)}_${data.listing_id}`;
      socket.to(roomName).emit('new_message', data);
    });

    socket.on('disconnect', () => {
      const userId = socketUsers.get(socket.id);
      if (userId) {
        userSockets.delete(userId);
        socketUsers.delete(socket.id);
        broadcastOnlineUsers();
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
          ['University Hoodie', 'Size Medium, barely worn.', 25.00, 'Clothing', 'https://picsum.photos/seed/hoodie/400/400'],
          ['Organic Chemistry Model Kit', 'Complete set, perfect for Chem 101.', 30.00, 'Textbooks', 'https://picsum.photos/seed/chem/400/400'],
          ['Mini Fridge', 'Energy efficient, fits under dorm bed.', 80.00, 'Electronics', 'https://picsum.photos/seed/fridge/400/400'],
          ['Bean Bag Chair', 'Very comfortable, navy blue.', 40.00, 'Furniture', 'https://picsum.photos/seed/beanbag/400/400'],
          ['Winter Jacket', 'Heavy duty, North Face, Size L.', 120.00, 'Clothing', 'https://picsum.photos/seed/jacket/400/400'],
          ['Yoga Mat', 'Non-slip, extra thick.', 20.00, 'Sports', 'https://picsum.photos/seed/yoga/400/400'],
          ['Bicycle', 'Mountain bike, 21 speeds.', 150.00, 'Sports', 'https://picsum.photos/seed/bike/400/400'],
          ['Coffee Maker', 'Single serve, includes reusable filter.', 35.00, 'Electronics', 'https://picsum.photos/seed/coffee/400/400'],
          ['Desk Organizer', 'Mesh metal, 5 compartments.', 10.00, 'Furniture', 'https://picsum.photos/seed/organizer/400/400'],
          ['Statistics Textbook', 'Introductory Statistics, 9th Edition.', 55.00, 'Textbooks', 'https://picsum.photos/seed/stats/400/400'],
          ['Bluetooth Speaker', 'Waterproof, JBL Flip 5.', 75.00, 'Electronics', 'https://picsum.photos/seed/speaker/400/400'],
          ['Floor Lamp', 'Modern design, black finish.', 25.00, 'Furniture', 'https://picsum.photos/seed/floorlamp/400/400'],
          ['Running Shoes', 'Nike Air Zoom, Size 10.', 60.00, 'Sports', 'https://picsum.photos/seed/shoes/400/400'],
          ['Backpack', 'Herschel Supply Co., classic style.', 45.00, 'Clothing', 'https://picsum.photos/seed/backpack/400/400'],
          ['Monitor', '24-inch IPS, 1080p.', 110.00, 'Electronics', 'https://picsum.photos/seed/monitor/400/400'],
          ['Electric Kettle', 'Fast boiling, auto shut-off.', 20.00, 'Electronics', 'https://picsum.photos/seed/kettle/400/400'],
          ['Study Table', 'Compact, white finish.', 50.00, 'Furniture', 'https://picsum.photos/seed/table/400/400']
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
  app.use('/uploads', express.static(UPLOADS_DIR));

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

  // --- Google OAuth Routes ---
  app.get('/api/auth/google/url', (req, res) => {
    const rootUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
    const options = {
      redirect_uri: `${process.env.APP_URL}/api/auth/google/callback`,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      access_type: 'offline',
      response_type: 'code',
      prompt: 'consent',
      scope: [
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/userinfo.email',
      ].join(' '),
    };

    const qs = new URLSearchParams(options);
    res.json({ url: `${rootUrl}?${qs.toString()}` });
  });

  app.get('/api/auth/google/callback', async (req, res) => {
    const code = req.query.code as string;
    if (!code) return res.status(400).send('No code provided');

    try {
      // Exchange code for tokens
      const tokenResponse = await axios.post('https://oauth2.googleapis.com/token', {
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: `${process.env.APP_URL}/api/auth/google/callback`,
        grant_type: 'authorization_code',
      });

      const { access_token, id_token } = tokenResponse.data;

      // Get user info from Google
      const googleUserResponse = await axios.get(
        `https://www.googleapis.com/oauth2/v1/userinfo?alt=json&access_token=${access_token}`,
        {
          headers: {
            Authorization: `Bearer ${id_token}`,
          },
        }
      );

      const googleUser = googleUserResponse.data;

      // Check if user exists in DB
      let user: any = db.prepare('SELECT * FROM users WHERE email = ?').get(googleUser.email);

      if (!user) {
        // Create new user
        const userCount: any = db.prepare('SELECT COUNT(*) as count FROM users').get();
        const role = userCount.count === 0 ? 'admin' : 'student';
        const info = db.prepare('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)').run(
          googleUser.name,
          googleUser.email,
          bcrypt.hashSync(Math.random().toString(36), 10), // Random password for OAuth users
          role
        );
        user = { id: info.lastInsertRowid, name: googleUser.name, email: googleUser.email, role };
      }

      const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET);

      // Send success message to parent window and close popup
      res.send(`
        <html>
          <body>
            <script>
              if (window.opener) {
                window.opener.postMessage({ 
                  type: 'OAUTH_AUTH_SUCCESS', 
                  token: '${token}', 
                  user: ${JSON.stringify({ id: user.id, name: user.name, email: user.email, role: user.role })} 
                }, '*');
                window.close();
              } else {
                window.location.href = '/';
              }
            </script>
            <p>Authentication successful. This window should close automatically.</p>
          </body>
        </html>
      `);
    } catch (err: any) {
      console.error('Google OAuth error:', err.response?.data || err.message);
      res.status(500).send('Authentication failed');
    }
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
    const { search, category, sort, limit = 12, offset = 0 } = req.query;
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

    query += ' LIMIT ? OFFSET ?';
    params.push(Number(limit), Number(offset));

    const listings = db.prepare(query).all(...params);
    res.json(listings);
  });

  app.get('/api/listings/:id', (req, res) => {
    const listing = db.prepare('SELECT listings.*, users.name as seller_name, users.email as seller_email FROM listings JOIN users ON listings.seller_id = users.id WHERE listings.id = ?').get(req.params.id);
    if (!listing) return res.status(404).json({ error: 'Listing not found' });
    res.json(listing);
  });

  app.post('/api/listings', authenticate, upload.single('image'), (req: any, res) => {
    const { title, description, price, category } = req.body;
    const image_url = req.file ? `/uploads/${req.file.filename}` : req.body.image_url;
    const info = db.prepare('INSERT INTO listings (seller_id, title, description, price, category, image_url) VALUES (?, ?, ?, ?, ?, ?)').run(req.user.id, title, description, price, category, image_url);
    res.json({ id: info.lastInsertRowid });
  });

  app.put('/api/listings/:id', authenticate, upload.single('image'), (req: any, res) => {
    const { title, description, price, category, status } = req.body;
    const listing: any = db.prepare('SELECT * FROM listings WHERE id = ?').get(req.params.id);
    if (!listing || listing.seller_id !== req.user.id) return res.status(403).json({ error: 'Unauthorized' });

    const image_url = req.file ? `/uploads/${req.file.filename}` : req.body.image_url;

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
    const totalReports: any = db.prepare("SELECT COUNT(*) as count FROM reports WHERE status = 'pending'").get();

    res.json({
      totalUsers: totalUsers.count,
      totalListings: totalListings.count,
      totalMessages: totalMessages.count,
      totalTransactions: totalTransactions.count,
      totalReports: totalReports.count,
      onlineUsers: userSockets.size,
      recentErrors: systemErrors.slice(0, 10)
    });
  });

  // --- Reporting & Warning Routes ---
  app.post('/api/reports', authenticate, (req: any, res) => {
    const { reported_id, reason } = req.body;
    db.prepare('INSERT INTO reports (reporter_id, reported_id, reason) VALUES (?, ?, ?)').run(req.user.id, reported_id, reason);
    res.json({ success: true });
  });

  app.get('/api/admin/reports', authenticate, (req: any, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    const reports = db.prepare(`
      SELECT reports.*, u1.name as reporter_name, u2.name as reported_name 
      FROM reports 
      JOIN users u1 ON reports.reporter_id = u1.id 
      JOIN users u2 ON reports.reported_id = u2.id 
      ORDER BY created_at DESC
    `).all();
    res.json(reports);
  });

  app.post('/api/admin/reports/:id/resolve', authenticate, (req: any, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    db.prepare("UPDATE reports SET status = 'resolved' WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  app.post('/api/admin/warnings', authenticate, (req: any, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    const { user_id, message } = req.body;
    db.prepare('INSERT INTO warnings (user_id, admin_id, message) VALUES (?, ?, ?)').run(user_id, req.user.id, message);
    res.json({ success: true });
  });

  app.get('/api/warnings', authenticate, (req: any, res) => {
    const warnings = db.prepare('SELECT * FROM warnings WHERE user_id = ? ORDER BY created_at DESC').all(req.user.id);
    res.json(warnings);
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
