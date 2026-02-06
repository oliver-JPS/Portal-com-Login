# 🚀 Node.js Identity Server Setup Guide

## Quick Start (5 Minutes)

### Step 1: Install Dependencies

Open PowerShell/Terminal in the project directory and run:

```powershell
cd "C:\Users\powji\Desktop\Teste Autenticação"
npm install
```

This will install:

- express (web server)
- jsonwebtoken (JWT tokens)
- bcryptjs (password hashing)
- better-sqlite3 (database)
- cors, helmet (security)
- dotenv (environment variables)

### Step 2: Initialize Database with Demo Users

```powershell
npm run init-db
```

This creates:

- SQLite database at `./database/auth.db`
- Two demo users:
  - **Email:** `admin@example.com` | **Password:** `admin123`
  - **Email:** `user@example.com` | **Password:** `password123`

### Step 3: Start the Server

```powershell
npm start
```

You should see:

```
🚀 ===============================================
🔐identity Server running on port 3000
📍 API Base URL: http://localhost:3000/api
🌍 Environment: development
🚀 ===============================================
```

### Step 4: Start the Frontend

Open **another** PowerShell/Terminal window:

```powershell
cd "C:\Users\powji\Desktop\Teste Autenticação"
npx -y http-server -p 8000
```

### Step 5: Test It!

1. Open browser: **http://localhost:8000**
2. Login with:
   - Email: `user@example.com`
   - Password: `password123`
3. You should see the landing page!

## ✅ What's Working

- ✓ Real JWT authentication
- ✓ Secure password hashing (bcrypt)
- ✓ Access tokens (15 minutes expiry)
- ✓ Refresh tokens (7 days expiry)
- ✓ Automatic token refresh
- ✓ Account locking after failed attempts
- ✓ Protected API endpoints
- ✓ Logout (revokes tokens)

## 📡 API Endpoints

### Public Endpoints

| Method | Endpoint             | Description                |
| ------ | -------------------- | -------------------------- |
| POST   | `/api/auth/register` | Register new user          |
| POST   | `/api/auth/login`    | Login (returns JWT tokens) |
| POST   | `/api/auth/refresh`  | Refresh access token       |

### Protected Endpoints (Require JWT)

| Method | Endpoint               | Description                   |
| ------ | ---------------------- | ----------------------------- |
| GET    | `/api/user/me`         | Get current user info         |
| GET    | `/api/auth/verify`     | Verify token validity         |
| POST   | `/api/auth/logout`     | Logout (revoke refresh token) |
| POST   | `/api/auth/logout-all` | Logout all sessions           |

## 🧪 Testing the API with Postman/cURL

### Register a New User

```powershell
curl -X POST http://localhost:3000/api/auth/register `
  -H "Content-Type: application/json" `
  -d '{\"email\":\"test@example.com\",\"password\":\"test123\",\"name\":\"Test User\"}'
```

### Login

```powershell
curl -X POST http://localhost:3000/api/auth/login `
  -H "Content-Type: application/json" `
  -d '{\"email\":\"user@example.com\",\"password\":\"password123\"}'
```

Response:

```json
{
  "success": true,
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "a1b2c3d4e5f6...",
  "expiresIn": "15m",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "Demo User"
  }
}
```

### Get User Info (Protected)

```powershell
curl -X GET http://localhost:3000/api/user/me `
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE"
```

## 🔧 Configuration

Edit `.env` file to customize:

```env
# Server
PORT=3000

# JWT Secrets (CHANGE IN PRODUCTION!)
JWT_SECRET=your-super-secret-key
JWT_REFRESH_SECRET=your-refresh-secret-key

# Token Expiration
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# CORS Settings
ALLOWED_ORIGINS=http://localhost:8000,http://127.0.0.1:8000

# Security
BCRYPT_ROUNDS=10
MAX_LOGIN_ATTEMPTS=5
LOCKOUT_TIME=900000
```

## 🔐 Security Features

### Password Security

- Bcrypt hashing with 10 rounds
- Minimum 6 characters required
- Never stored in plain text

### Token Security

- JWT with secure secrets
- Access tokens expire in 15 minutes
- Refresh tokens expire in 7 days
- Automatic token rotation
- Server-side token revocation

### Account Protection

- Rate limiting (5 login attempts per 15 minutes)
- Account lockout after 5 failed attempts
- Lockout duration: 15 minutes

### Request Security

- CORS protection
- Helmet.js security headers
- Rate limiting on all endpoints

## 📁 Database Schema

### Users Table

```sql
- id (INTEGER PRIMARY KEY)
- email (TEXT UNIQUE)
- password_hash (TEXT)
- name (TEXT)
- created_at (DATETIME)
- last_login (DATETIME)
- is_active (BOOLEAN)
- login_attempts (INTEGER)
- locked_until (DATETIME)
```

### Refresh Tokens Table

```sql
- id (INTEGER PRIMARY KEY)
- user_id (INTEGER FOREIGN KEY)
- token (TEXT UNIQUE)
- expires_at (DATETIME)
- revoked (BOOLEAN)
```

## 🚀 Production Deployment

### Important Changes for Production:

1. **Change JWT Secrets**

   ```bash
   # Generate strong secrets
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```

2. **Use HTTPS**
   - Never use HTTP in production
   - Use Let's Encrypt for free SSL

3. **Secure Token Storage**
   - Consider httpOnly cookies for refresh tokens
   - Add CSRF protection

4. **Environment Variables**
   - Never commit `.env` to git
   - Use environment-specific configurations

5. **Database**
   - Consider PostgreSQL or MySQL for production
   - Regular backups
   - Database encryption

6. **Rate Limiting**
   - Adjust limits based on traffic
   - Consider Redis for distributed rate limiting

## 🐛 Troubleshooting

### "Cannot find module 'express'"

```powershell
npm install
```

### "Port 3000 already in use"

Change PORT in `.env` file or stop other services:

```powershell
# Windows - Find and kill process
netstat -ano | findstr :3000
taskkill /PID <PID_NUMBER> /F
```

### "EACCES: permission denied" (SQLite)

Ensure the `database` directory exists and is writable:

```powershell
mkdir database
```

### Frontend can't connect to backend

1. Check server is running (terminal should show "Identity Server running")
2. Verify CORS settings in `.env`
3. Check browser console for errors

### Tokens not refreshing

1. Check browser console for errors
2. Verify JWT_SECRET matches in `.env`
3. Clear localStorage and login again

## 📊 Monitoring

### Check Database

```powershell
# Install SQLite viewer (optional)
npm install -g sqlite3

# View users
sqlite3 ./database/auth.db "SELECT id, email, name, last_login FROM users;"

# View active tokens
sqlite3 ./database/auth.db "SELECT user_id, expires_at, revoked FROM refresh_tokens WHERE revoked=0;"
```

### Server Logs

The server logs all:

- Authentication attempts
- Token refreshes
- Errors
- Token cleanup

## 🎓 Next Steps

### Add Features:

- Email verification
- Password reset
- Two-factor authentication (2FA)
- OAuth providers (Google, GitHub)
- User roles and permissions

- API documentation with Swagger
- Admin panel
- Session management
- Audit logs

## 📚 Learn More

- [JWT.io](https://jwt.io/) - JWT documentation
- [Express.js](https://expressjs.com/) - Web framework
- [bcrypt](https://www.npmjs.com/package/bcryptjs) - Password hashing
- [Better SQLite3](https://github.com/WiseLibs/better-sqlite3) - Database

---

**Your authentication backend is ready!** 🎉

Need help? Check the troubleshooting section or review the code comments in `server.js`.
