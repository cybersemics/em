// pm2 configuration
// https://pm2.keymetrics.io/docs/usage/application-declaration/

// NOTES
//   - Cannot use cluster mode due to yjs locks.
//   - Zero-downtime reload does does not work since level maintains a lock on the db.

module.exports = {
  apps: [
    {
      name: 'server',
      script: './build/server/src/index.js',
      time: true,
      wait_ready: true,
    },
  ],
}
