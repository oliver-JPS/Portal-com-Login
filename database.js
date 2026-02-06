const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');

// Database path from environment or default
const dbPath = process.env.DATABASE_PATH || './database/auth.db';
const dbDir = path.dirname(dbPath);

// Create database directory if it doesn't exist
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

let db = null;

// Initialize database
async function initializeDatabase() {
  console.log('📦 Initializing database...');

  // Initialize SQL.js
  const SQL = await initSqlJs();
  
  // Load existing database or create new one
  let buffer = null;
  if (fs.existsSync(dbPath)) {
    buffer = fs.readFileSync(dbPath);
  }
  
  db = new SQL.Database(buffer);

  // Enable foreign keys
  db.run('PRAGMA foreign_keys = ON');

  // Create tables
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT,
      name TEXT,
      google_id TEXT UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_login DATETIME,
      is_active INTEGER DEFAULT 1,
      login_attempts INTEGER DEFAULT 0,
      locked_until DATETIME
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token TEXT UNIQUE NOT NULL,
      expires_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      revoked INTEGER DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Create indexes for better performance
  db.run(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(token)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id)`);

  // Save to file
  saveDatabase();

  console.log('✅ Database initialized successfully');
}

// Save database to file
function saveDatabase() {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
  }
}

// Helper to get database (ensures it's initialized)
function getDB() {
  if (!db) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return db;
}

// User operations
function createUser(email, passwordHash, name = null) {
  try {
    const database = getDB();
    database.run(
      'INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)',
      [email, passwordHash, name]
    );
    
    const result = database.exec('SELECT last_insert_rowid() as id');
    const id = result[0].values[0][0];
    
    saveDatabase();
    return { id, email, name };
  } catch (error) {
    if (error.message.includes('UNIQUE constraint failed')) {
      throw new Error('User already exists');
    }
    throw error;
  }
}

function findUserByEmail(email) {
  const database = getDB();
  const result = database.exec(
    'SELECT * FROM users WHERE email = ?',
    [email]
  );
  
  if (result.length === 0 || result[0].values.length === 0) {
    return null;
  }
  
  const columns = result[0].columns;
  const values = result[0].values[0];
  
  const user = {};
  columns.forEach((col, idx) => {
    user[col] = values[idx];
  });
  
  return user;
}

function findUserById(id) {
  const database = getDB();
  const result = database.exec(
    'SELECT id, email, name, created_at, last_login, is_active FROM users WHERE id = ?',
    [id]
  );
  
  if (result.length === 0 || result[0].values.length === 0) {
    return null;
  }
  
  const columns = result[0].columns;
  const values = result[0].values[0];
  
  const user = {};
  columns.forEach((col, idx) => {
    user[col] = values[idx];
  });
  
  return user;
}

function createRefreshToken(userId, token, expiresAt) {
  const database = getDB();
  database.run(
    'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
    [userId, token, expiresAt]
  );
  saveDatabase();
}

function findValidRefreshToken(token) {
  const database = getDB();
  const result = database.exec(
    `SELECT * FROM refresh_tokens 
     WHERE token = ? AND revoked = 0 AND expires_at > datetime('now')`,
    [token]
  );
  
  if (result.length === 0 || result[0].values.length === 0) {
    return null;
  }
  
  const columns = result[0].columns;
  const values = result[0].values[0];
  
  const tokenData = {};
  columns.forEach((col, idx) => {
    tokenData[col] = values[idx];
  });
  
  return tokenData;
}

function revokeRefreshToken(token) {
  const database = getDB();
  database.run('UPDATE refresh_tokens SET revoked = 1 WHERE token = ?', [token]);
  saveDatabase();
}

function revokeAllUserTokens(userId) {
  const database = getDB();
  database.run('UPDATE refresh_tokens SET revoked = 1 WHERE user_id = ?', [userId]);
  saveDatabase();
}

function updateUserLogin(userId) {
  const database = getDB();
  database.run(
    `UPDATE users 
     SET last_login = CURRENT_TIMESTAMP, login_attempts = 0, locked_until = NULL 
     WHERE id = ?`,
    [userId]
  );
  saveDatabase();
}

function incrementLoginAttempts(email) {
  const database = getDB();
  database.run(
    'UPDATE users SET login_attempts = login_attempts + 1 WHERE email = ?',
    [email]
  );
  saveDatabase();
}

function lockAccount(email, seconds) {
  const database = getDB();
  database.run(
    `UPDATE users 
     SET locked_until = datetime('now', '+' || ? || ' seconds') 
     WHERE email = ?`,
    [seconds, email]
  );
  saveDatabase();
}

function isAccountLocked(email) {
  const database = getDB();
  const result = database.exec(
    `SELECT locked_until FROM users 
     WHERE email = ? AND locked_until > datetime('now')`,
    [email]
  );
  
  return result.length > 0 && result[0].values.length > 0;
}

// Google OAuth functions
function createUserWithGoogle(email, name, googleId) {
  try {
    const database = getDB();
    database.run(
      'INSERT INTO users (email, name, google_id) VALUES (?, ?, ?)',
      [email, name, googleId]
    );
    
    const result = database.exec('SELECT last_insert_rowid() as id');
    const id = result[0].values[0][0];
    
    saveDatabase();
    return { id, email, name, google_id: googleId };
  } catch (error) {
    if (error.message.includes('UNIQUE constraint failed')) {
      throw new Error('User already exists');
    }
    throw error;
  }
}

function updateUserGoogleId(userId, googleId) {
  const database = getDB();
  database.run(
    'UPDATE users SET google_id = ? WHERE id = ?',
    [googleId, userId]
  );
  saveDatabase();
}

// Periodic cleanup of expired tokens (run every hour)
setInterval(() => {
  if (!db) return;
  
  try {
    const database = getDB();
    database.run(
      `DELETE FROM refresh_tokens 
       WHERE expires_at < datetime('now') OR revoked = 1`
    );
    saveDatabase();
    console.log('🧹 Cleaned expired tokens');
  } catch (error) {
    console.error('Error cleaning tokens:', error);
  }
}, 3600000); // 1 hour

module.exports = {
  initializeDatabase,
  saveDatabase,
  createUser,
  createUserWithGoogle,
  updateUserGoogleId,
  findUserByEmail,
  findUserById,
  createRefreshToken,
  findValidRefreshToken,
  revokeRefreshToken,
  revokeAllUserTokens,
  updateUserLogin,
  incrementLoginAttempts,
  lockAccount,
  isAccountLocked
};
