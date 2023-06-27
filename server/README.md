A HocusPocus websocket server that automatically connects to the em front-end, syncs thoughts across devices, and uploads daily backups to an S3 endpoint.

## Setup

1. `npm install`
2. `npm run build`
3. Create an `.s3cfg` file in the server directory and add an S3 configuration.

   - This is used by the `backup` pm2 process which zips the database and uploads it to an S3 endpoint daily.
   - Daily backups are deleted after 90 days and monthly backups on the 1st of the month are retained.

   ```ini
   # See: https://github.com/raineorshine/node-s3-cli
   [default]
   access_key=YOUR_ACCESS_KEY
   secret_key=YOUR_SECRET_KEY
   endpoint=nyc3.digitaloceanspaces.com
   ```

## Running the server

```sh
npm start
```

pm2 processes that are started and kept alive on `npm start`:

- `server` - The HocusPocus server for syncing thoughts over a Websocket connection.
- `backup` - Daily database backup and upload to S3. You can also run the backup script manually with `./scripts/backup.sh`.

npm scripts:

- `logs` - Stream the pm2 logs.
- `restart` - Restart the pm2 processes.
- `postdeploy` - Safely restore the leveldb database from the last `predeploy`.
- `predeploy` - Backup the leveldb database to S3 to be used by `postdeploy`. Overwrites the last `predeploy`.
- `status` - Show the pm2 status.
- `stop` - Stop all pm2 processes.

## Deployment

The server can be deployed to a hosting platform. The instructions below are for Digital Ocean.

Buildpacks:

- Custom Build Command v0.1.1
- Node.js v0.3.4
- Procfile v0.0.3

App spec:

```yml
name: em-dev
region: nyc
services:
  - build_command: |-
      cd server &&
      npm install &&
      npm run build
    environment_slug: node-js
    envs:
      - key: REACT_APP_WEBSOCKET_HOST
        scope: RUN_AND_BUILD_TIME
        value: 0.0.0.0
      - key: REACT_APP_WEBSOCKET_PORT
        scope: RUN_AND_BUILD_TIME
        value: '80'
    github:
      branch: dev
      deploy_on_push: true
      repo: cybersemics/em
    health_check: {}
    http_port: 3001
    instance_count: 1
    instance_size_slug: basic-xxs
    name: em
    routes:
      - path: /
    run_command: cd server && HOST=0.0.0.0 PORT=3001 npm run start
    source_dir: /
```

**Note: These environment variables must be added to the front-end `.env` file:**

```ini
# .env.production
REACT_APP_WEBSOCKET_HOST=app12345.ondigitalocean.app/
REACT_APP_WEBSOCKET_PORT=80
```

## Environment Variables

The server uses its own environment variables for configuration (not to be confused with the `.env` files on the front-end).

- `process.env.AWS_ACCESS_KEY` - AWS access key for server/backup script.
- `process.env.AWS_ENDPOINT` - AWS endpoint for server/backup script. Default: nyc3.digitaloceanspaces.com
- `process.env.AWS_SECRET_KEY` - AWS secret key for server/backup script.
- `process.env.DB_DIR` - Level db directory. Default: `./db`
- `process.env.HOST` - localhost
- `process.env.PORT` - 3001
