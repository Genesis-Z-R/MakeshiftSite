import express from 'express';
import cors from 'cors';
import { createServer as createViteServer } from 'vite';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import pool from './db';
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
      origin: process.env.FRONTEND_URL || "*",
      methods: ["GET", "POST"],
      credentials: true
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
  const seedData = async () => {
    console.log('Checking if database needs seeding...');
    try {
      const userCountRes = await pool.query('SELECT COUNT(*) as count FROM users');
      const listingCountRes = await pool.query('SELECT COUNT(*) as count FROM listings');
      
      const userCount = parseInt(userCountRes.rows[0].count);
      const listingCount = parseInt(listingCountRes.rows[0].count);
      
      if (userCount === 0 || listingCount === 0) {
        console.log('Seeding database...');
        if (userCount === 0) {
          const hashedPassword = bcrypt.hashSync('password123', 10);
          await pool.query('INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4)', [
            'Admin User', 'admin@campus.edu', hashedPassword, 'admin'
          ]);
          await pool.query('INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4)', [
            'Jane Student', 'jane@campus.edu', hashedPassword, 'student'
          ]);
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

        if (listingCount === 0) {
          for (const [title, desc, price, cat, img] of listings) {
            await pool.query('INSERT INTO listings (seller_id, title, description, price, category, image_url) VALUES (1, $1, $2, $3, $4, $5)', [
              title, desc, price, cat, img
            ]);
          }
        }
        console.log('Database seeded successfully.');
      }
    } catch (err) {
      console.error('Seeding error:', err);
    }
  };
  await seedData();

  app.use(cors({
    origin: process.env.FRONTEND_URL || "*",
    credentials: true
  }));
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
      const userCountRes = await pool.query('SELECT COUNT(*) as count FROM users');
      const userCount = parseInt(userCountRes.rows[0].count);
      
      let role = 'student';
      if (adminPassword === 'Genesis@6112') {
        role = 'admin';
      } else if (userCount === 0) {
        role = 'admin';
      }
      const hashedPassword = await bcrypt.hash(password, 10);
      const result = await pool.query(
        'INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id',
        [name, email, hashedPassword, role]
      );
      const newUser = result.rows[0];
      const token = jwt.sign({ id: newUser.id, email, role }, JWT_SECRET);
      res.json({ token, user: { id: newUser.id, name, email, role } });
    } catch (err: any) {
      res.status(400).json({ error: 'Email already exists or invalid data' });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];
    
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
      const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [googleUser.email]);
      let user = userResult.rows[0];

      if (!user) {
        // Create new user
        const userCountRes = await pool.query('SELECT COUNT(*) as count FROM users');
        const userCount = parseInt(userCountRes.rows[0].count);
        const role = userCount === 0 ? 'admin' : 'student';
        const insertResult = await pool.query(
          'INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id',
          [
            googleUser.name,
            googleUser.email,
            bcrypt.hashSync(Math.random().toString(36), 10), // Random password for OAuth users
            role
          ]
        );
        user = { id: insertResult.rows[0].id, name: googleUser.name, email: googleUser.email, role };
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
  app.get('/api/listings', async (req, res) => {
    const { search, category, sort, limit = 12, offset = 0, seller_id } = req.query;
    
    // If seller_id is provided, we show all their items (available and sold)
    // Otherwise, we only show available items for the general marketplace
    let query = "SELECT listings.*, users.name as seller_name FROM listings JOIN users ON listings.seller_id = users.id";
    const params: any[] = [];
    let paramIndex = 1;

    if (seller_id) {
      query += ` WHERE seller_id = $${paramIndex}`;
      params.push(seller_id);
      paramIndex++;
    } else {
      query += " WHERE status = 'available'";
    }

    if (search) {
      query += ` AND (title ILIKE $${paramIndex} OR description ILIKE $${paramIndex + 1})`;
      params.push(`%${search}%`, `%${search}%`);
      paramIndex += 2;
    }
    if (category && category !== 'All') {
      query += ` AND category = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }

    if (sort === 'price_low') query += ' ORDER BY price ASC';
    else if (sort === 'price_high') query += ' ORDER BY price DESC';
    else query += ' ORDER BY created_at DESC';

    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(Number(limit), Number(offset));

    try {
      const result = await pool.query(query, params);
      res.json(result.rows);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch listings' });
    }
  });

  app.get('/api/listings/:id', async (req, res) => {
    try {
      const result = await pool.query(
        'SELECT listings.*, users.name as seller_name, users.email as seller_email FROM listings JOIN users ON listings.seller_id = users.id WHERE listings.id = $1',
        [req.params.id]
      );
      const listing = result.rows[0];
      if (!listing) return res.status(404).json({ error: 'Listing not found' });
      res.json(listing);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch listing' });
    }
  });

  app.post('/api/listings', authenticate, upload.single('image'), async (req: any, res) => {
    const { title, description, price, category } = req.body;
    const image_url = req.file ? `/uploads/${req.file.filename}` : req.body.image_url;
    try {
      const result = await pool.query(
        'INSERT INTO listings (seller_id, title, description, price, category, image_url) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
        [req.user.id, title, description, price, category, image_url]
      );
      res.json({ id: result.rows[0].id });
    } catch (err) {
      res.status(500).json({ error: 'Failed to create listing' });
    }
  });

  app.put('/api/listings/:id', authenticate, upload.single('image'), async (req: any, res) => {
    const { title, description, price, category, status } = req.body;
    try {
      const listingResult = await pool.query('SELECT * FROM listings WHERE id = $1', [req.params.id]);
      const listing = listingResult.rows[0];
      
      if (!listing || listing.seller_id !== req.user.id) return res.status(403).json({ error: 'Unauthorized' });

      const image_url = req.file ? `/uploads/${req.file.filename}` : req.body.image_url;

      await pool.query(
        'UPDATE listings SET title = $1, description = $2, price = $3, category = $4, image_url = $5, status = $6 WHERE id = $7',
        [title, description, price, category, image_url, status, req.params.id]
      );
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Failed to update listing' });
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
      res.status(500).json({ error: 'Failed to delete listing' });
    }
  });

  // --- User Routes ---
  app.get('/api/users/:id', async (req, res) => {
    try {
      const result = await pool.query('SELECT id, name, email, role, created_at FROM users WHERE id = $1', [req.params.id]);
      const user = result.rows[0];
      if (!user) return res.status(404).json({ error: 'User not found' });
      res.json(user);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch user' });
    }
  });

  // --- Message Routes ---
  app.post('/api/messages', authenticate, async (req: any, res) => {
    const { receiver_id, listing_id, content } = req.body;
    try {
      await pool.query(
        'INSERT INTO messages (sender_id, receiver_id, listing_id, content) VALUES ($1, $2, $3, $4)',
        [req.user.id, receiver_id, listing_id, content]
      );
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Failed to send message' });
    }
  });

  app.get('/api/messages', authenticate, async (req: any, res) => {
    try {
      const result = await pool.query(`
        SELECT messages.*, u1.name as sender_name, u2.name as receiver_name, listings.title as listing_title
        FROM messages
        JOIN users u1 ON messages.sender_id = u1.id
        JOIN users u2 ON messages.receiver_id = u2.id
        JOIN listings ON messages.listing_id = listings.id
        WHERE sender_id = $1 OR receiver_id = $1
        ORDER BY created_at DESC
      `, [req.user.id]);
      res.json(result.rows);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch messages' });
    }
  });

  // --- Admin Routes ---
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

  app.get('/api/admin/stats', authenticate, async (req: any, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    
    try {
      const totalUsersRes = await pool.query('SELECT COUNT(*) as count FROM users');
      const totalListingsRes = await pool.query('SELECT COUNT(*) as count FROM listings');
      const totalMessagesRes = await pool.query('SELECT COUNT(*) as count FROM messages');
      const totalTransactionsRes = await pool.query('SELECT COUNT(*) as count FROM transactions');
      const totalReportsRes = await pool.query("SELECT COUNT(*) as count FROM reports WHERE status = 'pending'");

      res.json({
        totalUsers: parseInt(totalUsersRes.rows[0].count),
        totalListings: parseInt(totalListingsRes.rows[0].count),
        totalMessages: parseInt(totalMessagesRes.rows[0].count),
        totalTransactions: parseInt(totalTransactionsRes.rows[0].count),
        totalReports: parseInt(totalReportsRes.rows[0].count),
        onlineUsers: userSockets.size,
        recentErrors: systemErrors.slice(0, 10)
      });
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch stats' });
    }
  });

  // --- Reporting & Warning Routes ---
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

  app.get('/api/admin/reports', authenticate, async (req: any, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    try {
      const result = await pool.query(`
        SELECT reports.*, u1.name as reporter_name, u2.name as reported_name 
        FROM reports 
        JOIN users u1 ON reports.reporter_id = u1.id 
        JOIN users u2 ON reports.reported_id = u2.id 
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
    const { user_id, message } = req.body;
    try {
      await pool.query(
        'INSERT INTO warnings (user_id, admin_id, message) VALUES ($1, $2, $3)',
        [user_id, req.user.id, message]
      );
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Failed to issue warning' });
    }
  });

  app.get('/api/warnings', authenticate, async (req: any, res) => {
    try {
      const result = await pool.query('SELECT * FROM warnings WHERE user_id = $1 ORDER BY created_at DESC', [req.user.id]);
      res.json(result.rows);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch warnings' });
    }
  });

  // --- Cart Routes ---
  app.get('/api/cart', authenticate, async (req: any, res) => {
    try {
      const result = await pool.query(`
        SELECT cart_items.*, listings.title, listings.price, listings.image_url, listings.status
        FROM cart_items
        JOIN listings ON cart_items.listing_id = listings.id
        WHERE cart_items.user_id = $1
      `, [req.user.id]);
      res.json(result.rows);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch cart' });
    }
  });

  app.get('/api/transactions', authenticate, async (req: any, res) => {
    try {
      const result = await pool.query(`
        SELECT transactions.*, listings.title, listings.image_url
        FROM transactions
        JOIN listings ON transactions.listing_id = listings.id
        WHERE transactions.buyer_id = $1
        ORDER BY transactions.created_at DESC
      `, [req.user.id]);
      res.json(result.rows);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch transactions' });
    }
  });

  app.post('/api/cart', authenticate, async (req: any, res) => {
    const { listing_id } = req.body;
    try {
      await pool.query('INSERT INTO cart_items (user_id, listing_id) VALUES ($1, $2)', [req.user.id, listing_id]);
      res.json({ success: true });
    } catch (err) {
      res.status(400).json({ error: 'Item already in cart' });
    }
  });

  app.delete('/api/cart/:id', authenticate, async (req: any, res) => {
    try {
      await pool.query('DELETE FROM cart_items WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Failed to remove from cart' });
    }
  });

  // --- Checkout Route ---
  app.post('/api/checkout', authenticate, async (req: any, res) => {
    const client = await pool.connect();
    try {
      const cartItemsResult = await client.query(`
        SELECT cart_items.*, listings.price, listings.status
        FROM cart_items
        JOIN listings ON cart_items.listing_id = listings.id
        WHERE cart_items.user_id = $1
      `, [req.user.id]);

      const cartItems = cartItemsResult.rows;

      if (cartItems.length === 0) return res.status(400).json({ error: 'Cart is empty' });

      await client.query('BEGIN');
      
      for (const item of cartItems) {
        if (item.status !== 'available') {
          throw new Error(`Item ${item.listing_id} is no longer available`);
        }
        // Create transaction
        await client.query('INSERT INTO transactions (buyer_id, listing_id, amount) VALUES ($1, $2, $3)', [req.user.id, item.listing_id, item.price]);
        // Increment sold count
        await client.query("UPDATE listings SET sold_count = sold_count + 1 WHERE id = $1", [item.listing_id]);
      }
      // Clear cart
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
