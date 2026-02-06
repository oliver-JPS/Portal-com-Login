// ============================================
// Authentication Module - Node.js Backend with JWT
// ============================================

// API Configuration
const AUTH_CONFIG = {
  apiBaseUrl: 'http://localhost:3000/api',
  
  // Local storage keys
  accessTokenKey: 'access_token',
  refreshTokenKey: 'refresh_token',
  userKey: 'auth_user',
};

// Authentication Service with JWT Backend
class AuthService {
  constructor() {
    this.isAuthenticated = this.checkAuth();
    this.refreshTokenTimeout = null;
    
    // Setup automatic token refresh
    if (this.isAuthenticated) {
      this.setupTokenRefresh();
    }
  }

  // Check if user is authenticated
  checkAuth() {
    const token = localStorage.getItem(AUTH_CONFIG.accessTokenKey);
    const user = localStorage.getItem(AUTH_CONFIG.userKey);
    return !!(token && user);
  }

  // Parse JWT token to get expiration
  parseJwt(token) {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      return JSON.parse(jsonPayload);
    } catch (e) {
      return null;
    }
  }

  // Setup automatic token refresh before expiration
  setupTokenRefresh() {
    const token = localStorage.getItem(AUTH_CONFIG.accessTokenKey);
    if (!token) return;

    const decoded = this.parseJwt(token);
    if (!decoded || !decoded.exp) return;

    // Refresh 1 minute before expiration
    const expiresIn = (decoded.exp * 1000) - Date.now() - 60000;
    
    if (expiresIn > 0) {
      this.refreshTokenTimeout = setTimeout(() => {
        this.refreshAccessToken();
      }, expiresIn);
    } else {
      // Token already expired, try to refresh immediately
      this.refreshAccessToken();
    }
  }

  // Clear token refresh timeout
  clearTokenRefresh() {
    if (this.refreshTokenTimeout) {
      clearTimeout(this.refreshTokenTimeout);
      this.refreshTokenTimeout = null;
    }
  }

  // Make API request with authentication
  async apiRequest(endpoint, options = {}) {
    const url = `${AUTH_CONFIG.apiBaseUrl}${endpoint}`;
    const token = localStorage.getItem(AUTH_CONFIG.accessTokenKey);

    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers
    });

    const data = await response.json();

    // Handle token expiration
    if (response.status === 401 && data.code === 'TOKEN_EXPIRED') {
      // Try to refresh token
      const refreshed = await this.refreshAccessToken();
      if (refreshed) {
        // Retry original request with new token
        return this.apiRequest(endpoint, options);
      }
    }

    if (!response.ok && !data.success) {
      throw new Error(data.error || 'Request failed');
    }

    return data;
  }

  // Register new user
  async register(email, password, name = null) {
    try {
      const response = await this.apiRequest('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password, name })
      });

      return { success: true, user: response.user };
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, error: error.message };
    }
  }

  // Login with email and password (auto-registers if user doesn't exist)
  async login(email, password) {
    try {
      const response = await this.apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });

      if (response.success) {
        // Store tokens
        localStorage.setItem(AUTH_CONFIG.accessTokenKey, response.accessToken);
        localStorage.setItem(AUTH_CONFIG.refreshTokenKey, response.refreshToken);
        localStorage.setItem(AUTH_CONFIG.userKey, JSON.stringify(response.user));

        this.isAuthenticated = true;
        
        // Setup automatic token refresh
        this.setupTokenRefresh();

        return { success: true, user: response.user };
      }

      // If login failed due to invalid password but user doesn't exist, try to register
      if (response.error && response.error.includes('Invalid email or password')) {
        // Attempt auto-registration
        const registerResponse = await this.register(email, password);
        
        if (registerResponse.success) {
          // Now login with the newly registered user
          return this.login(email, password);
        }
      }

      return { success: false, error: response.error };
    } catch (error) {
      console.error('Login error:', error);
      
      // If user not found, try to auto-register
      if (error.message.includes('Invalid email or password')) {
        try {
          console.log('🔄 User not found, attempting auto-registration...');
          const registerResult = await this.register(email, password);
          
          if (registerResult.success) {
            console.log('✅ Auto-registration successful, logging in...');
            // Recursively call login after successful registration
            return this.login(email, password);
          } else {
            return { success: false, error: 'Failed to auto-register: ' + registerResult.error };
          }
        } catch (regError) {
          return { success: false, error: 'Auto-registration failed: ' + regError.message };
        }
      }
      
      return { success: false, error: error.message };
    }
  }

  // Refresh access token using refresh token
  async refreshAccessToken() {
    try {
      const refreshToken = localStorage.getItem(AUTH_CONFIG.refreshTokenKey);
      
      if (!refreshToken) {
        this.logout();
        return false;
      }

      const response = await this.apiRequest('/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refreshToken })
      });

      if (response.success) {
        localStorage.setItem(AUTH_CONFIG.accessTokenKey, response.accessToken);
        
        // Setup next refresh
        this.setupTokenRefresh();
        
        return true;
      }

      return false;
    } catch (error) {
      console.error('Token refresh error:', error);
      this.logout();
      return false;
    }
  }

  // Logout
  async logout() {
    try {
      const refreshToken = localStorage.getItem(AUTH_CONFIG.refreshTokenKey);
      
      if (refreshToken) {
        // Notify server to revoke token
        await this.apiRequest('/auth/logout', {
          method: 'POST',
          body: JSON.stringify({ refreshToken })
        }).catch(() => {
          // Ignore errors, proceed with local logout
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear local storage
      localStorage.removeItem(AUTH_CONFIG.accessTokenKey);
      localStorage.removeItem(AUTH_CONFIG.refreshTokenKey);
      localStorage.removeItem(AUTH_CONFIG.userKey);
      
      this.isAuthenticated = false;
      this.clearTokenRefresh();
      
      window.location.href = 'login.html';
    }
  }

  // Get current user info from server
  async getCurrentUserInfo() {
    try {
      const response = await this.apiRequest('/user/me');
      return response.user;
    } catch (error) {
      console.error('Get user error:', error);
      return null;
    }
  }

  // Get current user from local storage
  getCurrentUser() {
    const userStr = localStorage.getItem(AUTH_CONFIG.userKey);
    return userStr ? JSON.parse(userStr) : null;
  }

  // Verify token is still valid
  async verifyToken() {
    try {
      const response = await this.apiRequest('/auth/verify');
      return response.valid;
    } catch (error) {
      return false;
    }
  }
}

// Initialize auth service
const authService = new AuthService();

// Page-specific initialization
document.addEventListener('DOMContentLoaded', () => {
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';

  if (currentPage === 'landing.html') {
    initLandingPage();
  } else if (currentPage === 'login.html') {
    initLoginPage();
  }
  // Welcome page (index.html) doesn't need initialization
});

// Login page initialization
function initLoginPage() {
  // Redirect if already authenticated
  if (authService.isAuthenticated) {
    window.location.href = 'landing.html';
    return;
  }

  const loginForm = document.getElementById('loginForm');
  const loginBtn = document.getElementById('loginBtn');

  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;

      // Add loading state
      loginBtn.classList.add('loading');
      loginBtn.disabled = true;
      loginBtn.textContent = 'Signing in...';

      // Attempt login
      const result = await authService.login(email, password);

      if (result.success) {
        // Show success animation
        loginBtn.textContent = '✓ Success!';

        // Redirect to landing page
        setTimeout(() => {
          window.location.href = 'landing.html';
        }, 500);
      } else {
        // Show error
        loginBtn.classList.remove('loading');
        loginBtn.disabled = false;
        loginBtn.textContent = 'Sign In';

        // Show error message
        alert(result.error || 'Login failed. Please check your credentials.');
      }
    });
  }

  // Add smooth focus animations
  const inputs = document.querySelectorAll('.form-control');
  inputs.forEach(input => {
    input.addEventListener('focus', (e) => {
      e.target.parentElement.classList.add('focused');
    });

    input.addEventListener('blur', (e) => {
      e.target.parentElement.classList.remove('focused');
    });
  });
}

// Landing page initialization
function initLandingPage() {
  // Redirect if not authenticated
  if (!authService.isAuthenticated) {
    window.location.href = 'login.html';
    return;
  }

  // Display user info
  const user = authService.getCurrentUser();
  const userEmailElement = document.getElementById('userEmail');

  if (userEmailElement && user) {
    userEmailElement.textContent = user.email;
  }

  // Setup logout button
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      if (confirm('Are you sure you want to logout?')) {
        authService.logout();
      }
    });
  }

  // Add card hover animations
  const cards = document.querySelectorAll('.card');
  cards.forEach((card, index) => {
    card.addEventListener('mouseenter', () => {
      card.style.transform = `translateY(-5px) rotate(${Math.random() * 2 - 1}deg)`;
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform = 'translateY(0) rotate(0deg)';
    });
  });
}

// Export for potential future use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { AuthService, authService };
}
