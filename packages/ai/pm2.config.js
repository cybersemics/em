// pm2 configuration
// https://pm2.keymetrics.io/docs/usage/application-declaration/

module.exports = {
  apps: [
    {
      name: 'ai',
      script: './build/packages/ai/src/index.js',
      time: true,
      wait_ready: true,
    },
  ],
}
