const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const db = require('./database');

// Serialize user for session
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser((id, done) => {
  try {
    const user = db.findUserById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// Google OAuth Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Extract user info from Google profile
        const email = profile.emails[0].value;
        const name = profile.displayName;
        const googleId = profile.id;

        // Check if user already exists
        let user = db.findUserByEmail(email);

        if (!user) {
          // Create new user with Google OAuth
          // No password needed for OAuth users
          user = db.createUserWithGoogle(email, name, googleId);
          console.log(`✅ New user created via Google OAuth: ${email}`);
        } else {
          // Update Google ID if not set
          if (!user.google_id) {
            db.updateUserGoogleId(user.id, googleId);
          }
          console.log(`✅ User logged in via Google OAuth: ${email}`);
        }

        return done(null, user);
      } catch (error) {
        console.error('Google OAuth error:', error);
        return done(error, null);
      }
    }
  )
);

module.exports = passport;
