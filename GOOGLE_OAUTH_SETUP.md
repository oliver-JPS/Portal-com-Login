# 🔐 Google OAuth Setup Guide

## ✨ What's Been Implemented

Your authentication system now includes **Google Sign In** functionality!

Users can now:

- ✅ Sign in with their Google account
- ✅ Auto-register if they don't have an account
- ✅ Get logged in automatically after Google authentication

## 📋 Setup Steps

### Step 1: Get Google OAuth Credentials

You need to create OAuth credentials in the Google Cloud Console:

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com

2. **Create a New Project** (or select existing)
   - Click "Select a project" → "NEW PROJECT"
   - Name: "Authentication Portal" (or any name)
   - Click "CREATE"

3. **Enable Google+ API**
   - In the sidebar: APIs & Services → Library
   - Search for "Google+ API"
   - Click "ENABLE"

4. **Configure OAuth Consent Screen**
   - APIs & Services → OAuth consent screen
   - Choose "External"
   - Fill in:
     - App name: "Authentication Portal"
     - User support email: your email
     - Developer contact: your email
   - Click "SAVE AND CONTINUE"
   - Scopes: Skip → "SAVE AND CONTINUE"
   - Test users: Add your email → "SAVE AND CONTINUE"

5. **Create OAuth 2.0 Client ID**
   - APIs & Services → Credentials
   - Click "+ CREATE CREDENTIALS" → "OAuth client ID"
   - Application type: "Web application"
   - Name: "Web Client"
   - **Authorized JavaScript origins:**
     ```
     http://localhost:8000
     http://localhost:3000
     ```
   - **Authorized redirect URIs:**
     ```
     http://localhost:3000/api/auth/google/callback
     ```
   - Click "CREATE"

6. **Copy Your Credentials**
   - You'll see a popup with:
     - Client ID: `something.apps.googleusercontent.com`
     - Client Secret: `GOCSPX-something`
   - **Keep these safe!**

### Step 2: Update `.env` File

Open `.env` in your project and update:

```env
GOOGLE_CLIENT_ID=YOUR_CLIENT_ID_HERE.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=YOUR_CLIENT_SECRET_HERE
GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback
SESSION_SECRET=change-this-to-random-string-in-production
```

**Important:** Replace the placeholder values with your actual credentials!

### Step 3: Restart the Server

```powershell
# Stop the current server (Ctrl + C)
# Then restart:
npm start
```

### Step 4: Test It!

1. Open: http://localhost:8000/login.html
2. Click "Sign in with Google"
3. Select your Google account
4. Grant permissions
5. You'll be redirected and logged in automatically!

## 🎨 What Was Added

### New Files:

- **`passport-config.js`** - Google OAuth strategy configuration
- **`auth-success.html`** - OAuth callback handler page

### Updated Files:

- **`package.json`** - Added passport, passport-google-oauth20, express-session
- **`.env` & `.env.example`** - Added Google OAuth settings
- **`database.js`** - Added `google_id` column and OAuth helper functions
- **`server.js`** - Added session support and Google OAuth routes
- **`login.html`** - Added "Sign in with Google" button
- **`styles.css`** - Added Google button styling

## 🔄 How It Works

```
User clicks "Sign in with Google"
           ↓
Redirected to Google login
           ↓
User authorizes app
           ↓
Google redirects back with code
           ↓
Server exchanges code for profile
           ↓
Check if user exists in database
    /            \
  YES            NO
   ↓              ↓
Login      Auto-create user
   ↓              ↓
Generate JWT tokens
   ↓
Redirect to dashboard
```

## 📊 Database Changes

The `users` table now includes:

```sql
google_id TEXT UNIQUE  -- Stores Google user ID
password_hash TEXT     -- Now optional (NULL for OAuth users)
```

OAuth users don't have a password - they only log in via Google!

## 🔐 Security Features

✅ **Secure OAuth Flow** - Industry-standard OAuth 2.0  
✅ **Session Management** - Secure session handling  
✅ **User Linking** - Existing users can link Google accounts  
✅ **Auto-Registration** - New users created automatically  
✅ **JWT Integration** - Same token system for all logins

## 🧪 Testing

### Test New Google User:

1. Use a Google account NOT in the database
2. Click "Sign in with Google"
3. Authorize the app
4. Should be registered and logged in automatically

### Test Existing User:

1. Register normally first: `test@example.com`
2. Sign in with Google using same email
3. Should link accounts and log in

## ⚠️ Important Notes

### For Development:

- ✅ Works with `localhost`
- ✅ No HTTPS required locally
- ✅ Can test with any Google account

### For Production:

- ⚠️ **MUST use HTTPS**
- ⚠️ Update redirect URIs to production domain
- ⚠️ Change session secret to strong random value
- ⚠️ Verify OAuth consent screen is published
- ⚠️ Add privacy policy and terms of service

## 🚨 Troubleshooting

### "redirect_uri_mismatch" Error:

- Check that redirect URI in Google Console exactly matches:
  ```
  http://localhost:3000/api/auth/google/callback
  ```
- No trailing slashes
- Correct port number

### "invalid_client" Error:

- Verify `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `.env`
- Make sure credentials are from same project
- Check for extra spaces or quotes

### Button Click Does Nothing:

- Check server is running on port 3000
- Verify session middleware is loaded
- Check console for errors (`F12`)

### Redirects to Login Instead of Dashboard:

- Check `auth-success.html` exists
- Verify tokens are being stored in localStorage
- Check browser console for errors

## 📝 API Endpoints

### Initiate Google OAuth:

```
GET http://localhost:3000/api/auth/google
```

### OAuth Callback (automatic):

```
GET http://localhost:3000/api/auth/google/callback?code=...
```

## 🎯 Next Steps

### Enhance OAuth:

- Add other providers (Facebook, GitHub, Microsoft)
- Add account linking UI
- Allow unlinking accounts
- Show connected accounts in profile

### Security Improvements:

- Add CSRF protection
- Implement state parameter validation
- Add nonce for additional security
- Implement refresh token rotation for OAuth users

## 📚 Resources

- [Google OAuth 2.0 Docs](https://developers.google.com/identity/protocols/oauth2)
- [Passport.js Documentation](http://www.passportjs.org/)
- [Google Cloud Console](https://console.cloud.google.com)

---

## ✅ Quick Checklist

Before using Google OAuth, make sure:

- [ ] Created Google Cloud project
- [ ] Enabled Google+ API
- [ ] Configured OAuth consent screen
- [ ] Created OAuth 2.0 credentials
- [ ] Added authorized redirect URI
- [ ] Updated `.env` with credentials
- [ ] Restarted the server
- [ ] Tested with a Google account

**Once completed, your users can sign in with Google!** 🎉
