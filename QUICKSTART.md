# Quick Start Guide

## 🚀 Getting Started

Your authentication portal is ready! Follow these simple steps:

### Option 1: Open Directly in Browser

1. Navigate to the folder: `C:\Users\powji\Desktop\Teste Autenticação\`
2. Double-click on `index.html`
3. Your default browser will open with the login page

### Option 2: Use a Local Server (Recommended)

For the best experience, use a local server:

**Using Python:**

```bash
# Navigate to the folder
cd "C:\Users\powji\Desktop\Teste Autenticação"

# Python 3
python -m http.server 8000

# Then open: http://localhost:8000
```

**Using Node.js (npx):**

```bash
# Navigate to the folder
cd "C:\Users\powji\Desktop\Teste Autenticação"

# Use npx http-server
npx -y http-server -p 8000

# Then open: http://localhost:8000
```

**Using VS Code:**

- Install "Live Server" extension
- Right-click on `index.html`
- Select "Open with Live Server"

## 📝 Test the Application

1. **Login Page** (`index.html`)
   - Enter any email (e.g., `user@example.com`)
   - Enter any password (e.g., `password123`)
   - Click "Sign In"

2. **Landing Page** (`landing.html`)
   - After login, you'll see the dashboard
   - Your email will be displayed in the navbar
   - Click "Logout" to return to login

## 🎨 What You'll See

- **Animated gradient background** with floating orbs
- **Glassmorphism design** with blur effects
- **Smooth animations** on all interactions
- **Premium color gradients** in purple/pink tones
- **Responsive layout** that works on any screen size
- **Micro-animations** on hover and focus

## 📁 File Structure

```
Teste Autenticação/
├── index.html          # Login page (start here)
├── landing.html        # Dashboard after login
├── styles.css          # Complete design system
├── auth.js            # Authentication logic
├── README.md          # Identity Server integration guide
└── QUICKSTART.md      # This file
```

## 🔧 Customization

### Change Colors

Edit `styles.css` and modify the CSS variables:

```css
:root {
  --primary-hue: 250; /* Change to any value 0-360 */
  --accent-hue: 290; /* Change to any value 0-360 */
}
```

**Color Examples:**

- Blue: `--primary-hue: 210;`
- Green: `--primary-hue: 150;`
- Orange: `--primary-hue: 30;`
- Red: `--primary-hue: 0;`

### Change Logo

In both `index.html` and `landing.html`, find:

```html
<div class="logo">A</div>
```

Replace `A` with your letter or emoji!

## 🔐 Next Steps: Identity Server

When you're ready to integrate a real authentication system, see `README.md` for the complete Identity Server integration guide.

## ✅ Checklist

- [ ] Open `index.html` in a browser
- [ ] Test the login flow
- [ ] Check the landing page
- [ ] Try the logout feature
- [ ] Test on mobile (responsive design)
- [ ] Customize colors to your brand
- [ ] Review README.md for Identity Server integration

## 🎯 Current Features

✅ Beautiful modern UI with glassmorphism  
✅ Smooth animations and transitions  
✅ Fully responsive design  
✅ Simple login/logout flow  
✅ Session persistence (localStorage)  
✅ Protected routes (auto-redirect)  
✅ Ready for Identity Server integration

---

**Enjoy your new authentication portal!** 🎉

If you have any questions, check the `README.md` for detailed documentation.
