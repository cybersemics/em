// pm2 configuration
// https://pm2.keymetrics.io/docs/usage/application-declaration/

// NOTES
//   - Cannot use cluster mode due to yjs locks.
//   - Zero-downtime reload does does not work since level maintains a lock on the db.

module.exports = {
  apps: [
    {
      name: 'server',
      script: './build/server/index.js',
      time: true,
      wait_ready: true,
    },
    {
      name: 'backup',
      script: './scripts/backup.sh',
      // requires pm2 delete backup or pm2 restart backup --cron-restart 0 to stop
      // pm2 stop does not terminate the cron
      cron_restart: '0 0 * * *',
      // stop_exit_codes is not working yet
      // https://github.com/Unitech/pm2/issues/5208
      // stop_exit_codes: [0],
      // exp_backoff_restart_delay: 100,
      autorestart: false,
      max_memory_restart: '500M',
      time: true,
    },
  ],
}
