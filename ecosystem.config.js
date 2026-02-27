module.exports = {
  apps: [
    {
      name: 'sharebill-api',
      cwd: './apps/api',
      script: 'dist/index.js',
      watch: false,
      env: {
        NODE_ENV: 'production',
      },
    },
    {
      name: 'sharebill-auth',
      cwd: './services/auth',
      script: 'dist/index.js',
      watch: false,
      env: { NODE_ENV: 'production' },
    },
    {
      name: 'sharebill-expense',
      cwd: './services/expense',
      script: 'dist/index.js',
      watch: false,
      env: { NODE_ENV: 'production' },
    },
    {
      name: 'sharebill-user',
      cwd: './services/user',
      script: 'dist/index.js',
      watch: false,
      env: { NODE_ENV: 'production' },
    },
  ],
};
