import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
  max: 20,
  // Supabase requires SSL for external connections
  ssl: process.env.DATABASE_URL?.includes('localhost') 
    ? false 
    : { rejectUnauthorized: false },
});

// Just a simple connection check instead of full table initialization
const checkConnection = async () => {
  console.log('Attempting to connect to Supabase PostgreSQL...');
  try {
    const client = await pool.connect();
    console.log('Connected to Supabase successfully!');
    
    // Quick check to see if our users table is visible
    const res = await client.query('SELECT COUNT(*) FROM users');
    console.log(`Current user count in database: ${res.rows[0].count}`);
    
    client.release();
  } catch (err) {
    console.error('Database connection error:', err);
  }
};

checkConnection();

export default pool;