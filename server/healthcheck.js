const mongoose = require('mongoose');
const axios = require('axios');

async function healthCheck() {
  try {
    // Check database connection
    if (mongoose.connection.readyState !== 1) {
      console.error('Database not connected');
      process.exit(1);
    }

    // Test database query
    await mongoose.connection.db.admin().ping();
    console.log('Database connection: OK');

    // Check if server is responding
    try {
      const response = await axios.get('http://localhost:5000/health', {
        timeout: 5000
      });
      
      if (response.status === 200) {
        console.log('Server health check: OK');
        process.exit(0);
      } else {
        console.error('Server health check failed');
        process.exit(1);
      }
    } catch (error) {
      console.error('Server health check error:', error.message);
      process.exit(1);
    }
  } catch (error) {
    console.error('Health check failed:', error.message);
    process.exit(1);
  }
}

// Run health check
healthCheck();
