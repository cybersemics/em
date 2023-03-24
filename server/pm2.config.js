// pm2 configuration
// cannot use cluster mode due to yjs locks
// https://pm2.keymetrics.io/docs/usage/application-declaration/
module.exports = {
  apps: [
    {
      name: 'server',
      script: './build/server/index.js',
    },
  ],
}
