module.exports = {
  apps: [
    {
      name: 'controlpanel',
      script: 'node',
      args: '--import tsx server.ts',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
  ],
};
