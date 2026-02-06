require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const session = require('express-session');
const passport = require('./passport-config');

const db = require('./database');
const { authenticateToken } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true
}));
app.use(express.json());

// Session configuration (required for OAuth)
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Rate limiting
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: { success: false, error: 'Too many login attempts, please try again later' }
});

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});

app.use('/api/', generalLimiter);

// Helper functions
function generateAccessToken(user) {
  return jwt.sign(
    { 
      id: user.id, 
      email: user.email,
      name: user.name 
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );
}

function generateRefreshToken() {
  return crypto.randomBytes(64).toString('hex');
}

// ============================================
// PUBLIC ROUTES
// ============================================

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Identity server is running',
    timestamp: new Date().toISOString()
  });
});

// Register new user
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters long'
      });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format'
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, parseInt(process.env.BCRYPT_ROUNDS));

    // Create user
    const user = db.createUser(email, passwordHash, name);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      }
    });
  } catch (error) {
    if (error.message === 'User already exists') {
      return res.status(409).json({
        success: false,
        error: 'User with this email already exists'
      });
    }

    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Registration failed'
    });
  }
});

// Login
app.post('/api/auth/login', loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }

    // Check if account is locked
    if (db.isAccountLocked(email)) {
      return res.status(423).json({
        success: false,
        error: 'Account is temporarily locked due to too many failed login attempts'
      });
    }

    // Find user
    const user = db.findUserByEmail(email);

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    // Check if user is active
    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        error: 'Account is deactivated'
      });
    }

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      // Increment login attempts
      db.incrementLoginAttempts(email);
      
      const maxAttempts = parseInt(process.env.MAX_LOGIN_ATTEMPTS);
      const currentAttempts = (user.login_attempts || 0) + 1;
      
      if (currentAttempts >= maxAttempts) {
        db.lockAccount(email, parseInt(process.env.LOCKOUT_TIME) / 1000);
        return res.status(423).json({
          success: false,
          error: 'Too many failed attempts. Account locked temporarily.'
        });
      }

      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken();

    // Store refresh token
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days
    db.createRefreshToken(user.id, refreshToken, expiresAt.toISOString());

    // Update last login
    db.updateUserLogin(user.id);

    res.json({
      success: true,
      message: 'Login successful',
      accessToken,
      refreshToken,
      expiresIn: process.env.JWT_EXPIRES_IN,
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Login failed'
    });
  }
});

// ============================================
// GOOGLE OAUTH ROUTES
// ============================================

// Initiate Google OAuth
app.get('/api/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

// Google OAuth callback
app.get('/api/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/login.html' }),
  (req, res) => {
    try {
      // User is authenticated via Passport
      const user = req.user;

      // Generate JWT tokens
      const accessToken = generateAccessToken(user);
      const refreshToken = generateRefreshToken();

      // Store refresh token
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days
      db.createRefreshToken(user.id, refreshToken, expiresAt.toISOString());

      // Update last login
      db.updateUserLogin(user.id);

      // Redirect to frontend with tokens in URL (will be handled by frontend)
      const frontendUrl = process.env.ALLOWED_ORIGINS?.split(',')[0] || 'http://localhost:8000';
      res.redirect(`${frontendUrl}/auth-success.html?access_token=${accessToken}&refresh_token=${refreshToken}`);
    } catch (error) {
      console.error('Google OAuth callback error:', error);
      res.redirect('/login.html?auth error=Authentication failed');
    }
  }
);

// ============================================
// TOKEN MANAGEMENT
// ============================================

// Refresh access token
app.post('/api/auth/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: 'Refresh token required'
      });
    }

    // Find and validate refresh token
    const tokenData = db.findValidRefreshToken(refreshToken);

    if (!tokenData) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired refresh token'
      });
    }

    // Get user
    const user = db.findUserById(tokenData.user_id);

    if (!user || !user.is_active) {
      return res.status(401).json({
        success: false,
        error: 'User not found or inactive'
      });
    }

    // Generate new access token
    const accessToken = generateAccessToken(user);

    res.json({
      success: true,
      accessToken,
      expiresIn: process.env.JWT_EXPIRES_IN
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({
      success: false,
      error: 'Token refresh failed'
    });
  }
});

// Logout
app.post('/api/auth/logout', authenticateToken, (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      db.revokeRefreshToken(refreshToken);
    }

    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      error: 'Logout failed'
    });
  }
});

// Logout all sessions
app.post('/api/auth/logout-all', authenticateToken, (req, res) => {
  try {
    db.revokeAllUserTokens(req.user.id);

    res.json({
      success: true,
      message: 'All sessions logged out successfully'
    });
  } catch (error) {
    console.error('Logout all error:', error);
    res.status(500).json({
      success: false,
      error: 'Logout failed'
    });
  }
});

// ============================================
// PROTECTED ROUTES
// ============================================

// Get current user info
app.get('/api/user/me', authenticateToken, (req, res) => {
  try {
    const user = db.findUserById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        created_at: user.created_at,
        last_login: user.last_login
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user info'
    });
  }
});

// Verify token endpoint
app.get('/api/auth/verify', authenticateToken, (req, res) => {
  res.json({
    success: true,
    valid: true,
    user: {
      id: req.user.id,
      email: req.user.email,
      name: req.user.name
    }
  });
});

// ============================================
// ERROR HANDLING
// ============================================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// ============================================
// START SERVER
// ============================================

async function startServer() {
  try {
    // Initialize database first
    await db.initializeDatabase();
    
    app.listen(PORT, () => {
      console.log('🚀 ===============================================');
      console.log(`🔐 Identity Server running on port ${PORT}`);
      console.log(`📍 API Base URL: http://localhost:${PORT}/api`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
      console.log('🚀 ===============================================');
      console.log('');
      console.log('Available endpoints:');
      console.log('  POST /api/auth/register   - Register new user');
      console.log('  POST /api/auth/login      - Login');
      console.log('  POST /api/auth/refresh    - Refresh access token');
      console.log('  POST /api/auth/logout     - Logout');
      console.log('  GET  /api/auth/verify     - Verify token');
      console.log('  GET  /api/user/me         - Get user info');
      console.log('');
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

module.exports = app;
