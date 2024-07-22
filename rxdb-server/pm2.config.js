// pm2 configuration
// https://pm2.keymetrics.io/docs/usage/application-declaration/

module.exports = {
  apps: [
    {
      name: 'server',
      script: './build/index.js',
      time: true,
      wait_ready: true,
    },
  ],
}
