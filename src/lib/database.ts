import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import path from 'path';
import bcrypt from 'bcryptjs';

// Database file path
const dbPath = path.join(process.cwd(), 'data', 'app.db');

let db: Database | null = null;

// User interface
export interface User {
  id: string;
  email: string;
  password: string;
  name: string;
  createdAt: string;
  lastLogin?: string;
}

// Initialize database connection
export async function initDatabase(): Promise<Database> {
  if (db) return db;

  try {
    // Create data directory if it doesn't exist
    const fs = await import('fs/promises');
    const dataDir = path.join(process.cwd(), 'data');
    try {
      await fs.mkdir(dataDir, { recursive: true });
    } catch (error) {
      // Directory might already exist, ignore
    }

    // Open database connection
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });

    // Create users table if it doesn't exist
    await db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        name TEXT NOT NULL,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
        lastLogin TEXT,
        isActive INTEGER DEFAULT 1
      );
      
      -- Create indexes for better performance
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_active ON users(isActive);
    `);

    console.log('✅ Database initialized successfully');
    
    // Create default users if none exist
    await createDefaultUsers();
    
    return db;
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
}

// Create default users for demo purposes
async function createDefaultUsers() {
  try {
    const db = await initDatabase();
    
    // Check if any users exist
    const userCount = await db.get('SELECT COUNT(*) as count FROM users');
    
    if (userCount.count === 0) {
      console.log('Creating default users...');
      
      // Hash default passwords
      const demoPasswordHash = await bcrypt.hash('password123', 10);
      const userPasswordHash = await bcrypt.hash('Password1@&#!*', 10);
      
      // Insert default users
      await db.run(`
        INSERT INTO users (id, email, password, name)
        VALUES 
          ('1', 'demo@example.com', ?, 'Demo User'),
          ('2', 'shathishwarma@gmail.com', ?, 'Shathishwarma')
      `, [demoPasswordHash, userPasswordHash]);
      
      console.log('✅ Default users created');
    }
  } catch (error) {
    console.error('❌ Failed to create default users:', error);
  }
}

// Find user by email
export async function findUserByEmail(email: string): Promise<User | null> {
  try {
    const database = await initDatabase();
    const user = await database.get(
      'SELECT * FROM users WHERE email = ? AND isActive = 1',
      [email.toLowerCase()]
    );
    return user || null;
  } catch (error) {
    console.error('❌ Error finding user by email:', error);
    return null;
  }
}

// Create new user
export async function createUser(email: string, password: string, name: string): Promise<User | null> {
  try {
    const database = await initDatabase();
    
    // Generate unique ID
    const userId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    
    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);
    
    // Insert user
    await database.run(
      'INSERT INTO users (id, email, password, name) VALUES (?, ?, ?, ?)',
      [userId, email.toLowerCase(), passwordHash, name]
    );
    
    // Return created user (without password)
    const user = await findUserByEmail(email);
    return user;
  } catch (error) {
    console.error('❌ Error creating user:', error);
    return null;
  }
}

// Update user last login
export async function updateUserLastLogin(userId: string): Promise<boolean> {
  try {
    const database = await initDatabase();
    await database.run(
      'UPDATE users SET lastLogin = CURRENT_TIMESTAMP WHERE id = ?',
      [userId]
    );
    return true;
  } catch (error) {
    console.error('❌ Error updating user last login:', error);
    return false;
  }
}

// Verify user password
export async function verifyUserPassword(email: string, password: string): Promise<User | null> {
  try {
    const user = await findUserByEmail(email);
    if (!user) return null;
    
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) return null;
    
    // Update last login
    await updateUserLastLogin(user.id);
    
    return user;
  } catch (error) {
    console.error('❌ Error verifying user password:', error);
    return null;
  }
}

// Get all users (admin function)
export async function getAllUsers(): Promise<User[]> {
  try {
    const database = await initDatabase();
    const users = await database.all('SELECT id, email, name, createdAt, lastLogin FROM users WHERE isActive = 1');
    return users;
  } catch (error) {
    console.error('❌ Error getting all users:', error);
    return [];
  }
}

// Close database connection
export async function closeDatabase(): Promise<void> {
  if (db) {
    await db.close();
    db = null;
    console.log('✅ Database connection closed');
  }
}