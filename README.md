# Authentication Portal

A modern, beautiful login portal with Identity Server integration ready.

## Features

- 🎨 **Premium Design** - Modern glassmorphism UI with smooth animations
- 🔐 **Security Ready** - Structured for Identity Server integration
- 📱 **Responsive** - Works beautifully on all devices
- ⚡ **Fast & Lightweight** - Pure HTML, CSS, and vanilla JavaScript

## Current Setup

The application currently uses a simple mock authentication system stored in localStorage. This is designed to be easily replaced with a proper Identity Server.

### Files Structure

```
├── index.html      # Login page
├── landing.html    # Dashboard/Landing page (after login)
├── styles.css      # Complete design system
└── auth.js         # Authentication logic (ready for Identity Server)
```

## How to Use

1. Open `index.html` in a browser
2. Enter any email and password to "login"
3. You'll be redirected to the landing page
4. Click "Logout" to return to login

## Identity Server Integration Guide

When you're ready to integrate with Identity Server (e.g., IdentityServer4, Duende IdentityServer, Auth0, Okta, etc.), follow these steps:

### Step 1: Update Configuration

In `auth.js`, update the `AUTH_CONFIG` object:

```javascript
const AUTH_CONFIG = {
  identityServerUrl: "https://your-identity-server.com",
  clientId: "your-client-id",
  redirectUri: "https://your-app.com/callback",
  scope: "openid profile email",
  responseType: "code",

  tokenKey: "auth_token",
  userKey: "auth_user",
};
```

### Step 2: Install OIDC Client (Optional)

For easier integration, you can use the `oidc-client-ts` library:

```bash
npm install oidc-client-ts
```

Or include via CDN in your HTML:

```html
<script src="https://cdn.jsdelivr.net/npm/oidc-client-ts/dist/browser/oidc-client-ts.min.js"></script>
```

### Step 3: Replace Authentication Methods

The `auth.js` file has clearly marked `TODO` sections where you need to implement:

1. **initializeOIDC()** - Initialize the OIDC client
2. **redirectToLogin()** - Redirect to Identity Server login page
3. **handleCallback()** - Handle OAuth callback with authorization code
4. **refreshToken()** - Refresh expired access tokens
5. **validateToken()** - Validate JWT tokens

### Step 4: Implement OAuth/OIDC Flow

Replace the `login()` method with proper OAuth flow:

```javascript
async login() {
  // Redirect to Identity Server
  const authUrl = `${AUTH_CONFIG.identityServerUrl}/connect/authorize?` +
    `client_id=${AUTH_CONFIG.clientId}&` +
    `redirect_uri=${AUTH_CONFIG.redirectUri}&` +
    `response_type=code&` +
    `scope=${AUTH_CONFIG.scope}`;

  window.location.href = authUrl;
}
```

### Step 5: Create Callback Handler

Create a new `callback.html` page to handle the OAuth callback:

```html
<!DOCTYPE html>
<html>
  <head>
    <title>Authentication Callback</title>
  </head>
  <body>
    <p>Processing authentication...</p>
    <script src="auth.js"></script>
    <script>
      // Handle callback and exchange code for tokens
      authService.handleCallback();
    </script>
  </body>
</html>
```

### Step 6: Implement Token Exchange

In the `handleCallback()` method:

```javascript
async handleCallback() {
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');

  if (code) {
    // Exchange code for tokens
    const tokenResponse = await fetch(`${AUTH_CONFIG.identityServerUrl}/connect/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: AUTH_CONFIG.redirectUri,
        client_id: AUTH_CONFIG.clientId,
      })
    });

    const tokens = await tokenResponse.json();
    localStorage.setItem(AUTH_CONFIG.tokenKey, tokens.access_token);

    // Decode and store user info
    const userInfo = this.parseJwt(tokens.id_token);
    localStorage.setItem(AUTH_CONFIG.userKey, JSON.stringify(userInfo));

    window.location.href = 'landing.html';
  }
}
```

## Popular Identity Server Options

### 1. **Duende IdentityServer** (Self-hosted, .NET)

- Most popular for ASP.NET applications
- Full control over authentication flow
- https://duendesoftware.com/

### 2. **Auth0** (Cloud-based)

- Easy to set up
- Rich features out of the box
- https://auth0.com/

### 3. **Azure AD B2C** (Cloud-based)

- Great for Microsoft ecosystem
- Enterprise-ready
- https://azure.microsoft.com/services/active-directory-b2c/

### 4. **Okta** (Cloud-based)

- Enterprise identity management
- Developer-friendly
- https://www.okta.com/

### 5. **Keycloak** (Self-hosted, Open Source)

- Free and open source
- Feature-rich
- https://www.keycloak.org/

## Design Customization

All design tokens are defined in CSS variables at the top of `styles.css`:

```css
:root {
  --primary-hue: 250; /* Main color hue */
  --accent-hue: 290; /* Accent color hue */
  --background: hsl(230, 25%, 8%);
  /* ... more variables */
}
```

Simply modify these values to match your brand colors!

## Browser Compatibility

- Chrome/Edge: ✅ Full support
- Firefox: ✅ Full support
- Safari: ✅ Full support
- Opera: ✅ Full support

## Security Notes

⚠️ **Important**: The current implementation uses localStorage for demo purposes. When integrating Identity Server:

1. Store tokens securely (consider httpOnly cookies for refresh tokens)
2. Implement proper CSRF protection
3. Use HTTPS in production
4. Implement token refresh logic
5. Add proper error handling
6. Validate all JWT tokens
7. Implement session timeout

## License

MIT License - Feel free to use this in your projects!

---

**Ready for Identity Server Integration** 🚀

All the placeholder code is clearly marked with `TODO` comments and can be easily replaced with your Identity Server implementation.
