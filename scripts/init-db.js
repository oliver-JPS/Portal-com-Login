require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('../database');

console.log('🔧 Initializing database with demo users...\n');

async function initDatabase() {
  try {
    // Initialize database
    await db.initializeDatabase();
    
    // Create demo users
    const demoUsers = [
      {
        email: 'admin@example.com',
        password: 'admin123',
        name: 'Admin User'
      },
      {
        email: 'user@example.com',
        password: 'password123',
        name: 'Demo User'
      }
    ];

    for (const userData of demoUsers) {
      try {
        const passwordHash = await bcrypt.hash(userData.password, 10);
        const user = db.createUser(userData.email, passwordHash, userData.name);
        
        console.log(`✅ Created user: ${userData.email}`);
        console.log(`   Password: ${userData.password}`);
        console.log(`   Name: ${userData.name}\n`);
      } catch (error) {
        if (error.message === 'User already exists') {
          console.log(`⚠️  User ${userData.email} already exists\n`);
        } else {
          throw error;
        }
      }
    }

    console.log('✨ Database initialization complete!');
    console.log('\n📝 You can now login with:');
    console.log('   Email: admin@example.com');
    console.log('   Password: admin123');
    console.log('\n   OR\n');
    console.log('   Email: user@example.com');
    console.log('   Password: password123\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error initializing database:', error);
    process.exit(1);
  }
}

initDatabase();
