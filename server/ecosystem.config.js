module.exports = {
  apps: [
    {
      name: 'wefuel-api',
      script: 'index.js',
      instances: 'max', // Use all available CPU cores
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 5000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 5000
      },
      // Logging
      log_file: './logs/combined.log',
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      
      // Monitoring
      pmx: true,
      monitoring: true,
      
      // Restart policy
      max_memory_restart: '1G',
      min_uptime: '10s',
      max_restarts: 10,
      
      // Watch mode (development)
      watch: false,
      ignore_watch: ['node_modules', 'logs', '*.log'],
      
      // Graceful shutdown
      kill_timeout: 5000,
      listen_timeout: 3000,
      
      // Environment variables
      env_file: '.env',
      
      // Source map support
      source_map_support: true,
      
      // Node options
      node_args: '--max-old-space-size=4096',
      
      // Cron restart (optional)
      cron_restart: '0 2 * * *', // Restart at 2 AM daily
      
      // Merge logs
      merge_logs: true,
      
      // Auto restart on file change (development only)
      autorestart: true,
      
      // Error handling
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_file: './logs/combined.log',
      
      // Time format
      time: true
    }
  ],

  deploy: {
    production: {
      user: 'deploy',
      host: 'your-server-ip',
      ref: 'origin/main',
      repo: 'git@github.com:your-username/wefuel.git',
      path: '/var/www/wefuel',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && pm2 reload ecosystem.config.js --env production',
      'pre-setup': ''
    }
  }
};
