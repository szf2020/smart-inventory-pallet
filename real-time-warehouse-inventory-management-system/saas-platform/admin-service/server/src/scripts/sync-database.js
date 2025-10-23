const { sequelize } = require('../models');
const bcrypt = require('bcrypt');

async function syncDatabase() {
  try {
    console.log('🔄 Starting database synchronization...');
    
    // Sync all models with force: true to drop and recreate tables
    await sequelize.sync({ force: true });
    
    console.log('✅ Database synchronized successfully!');
    console.log('📋 Tables created from model definitions');
    
    // Create initial admin users
    console.log('🔄 Creating initial admin users...');
    
    const { SystemAdmin } = sequelize.models;
    
    const hashedPassword = await bcrypt.hash('admin123!', 12);
    
    await SystemAdmin.bulkCreate([
      {
        username: 'superadmin',
        password: hashedPassword,
        email: 'admin@cnhdistributors.com',
        full_name: 'Super Administrator',
        role: 'super_admin',
        status: 'active'
      },
      {
        username: 'admin',
        password: hashedPassword,
        email: 'support@cnhdistributors.com',
        full_name: 'System Administrator',
        role: 'admin',
        status: 'active'
      }
    ]);
    
    console.log('✅ Initial admin users created successfully!');
    console.log('👤 Login credentials:');
    console.log('   Username: superadmin | Password: admin123!');
    console.log('   Username: admin | Password: admin123!');
    
    console.log('✅ Database sync completed! Tables created from model definitions.');
    console.log('🎉 Database setup complete!');
    
  } catch (error) {
    console.error('❌ Error during database sync:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

// Run the sync
syncDatabase()
  .then(() => {
    console.log('Database sync completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Database sync failed:', error);
    process.exit(1);
  });
