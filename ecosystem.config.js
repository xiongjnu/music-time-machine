module.exports = {
  apps: [{
    name: 'musictm',
    script: 'server/index.js',
    cwd: '/Users/xj/projectxjai/claude/code/musictm',
    env: {
      PORT: 3000,
      NODE_ENV: 'production',
    },
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    max_memory_restart: '200M',
    autorestart: true,
    watch: false,
  }],
};
