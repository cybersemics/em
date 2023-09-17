A HocusPocus websocket server that automatically connects to the em front-end, syncs thoughts across devices, and uploads daily backups to an S3 endpoint.

## Setup

1. `yarn`
2. `npm run build`

## Running the server

```sh
npm start
```

pm2 processes that are started and kept alive on `npm start`:

- `server` - The HocusPocus server for syncing thoughts over a Websocket connection.

npm scripts:

- `logs` - Stream the pm2 logs.
- `restart` - Restart the pm2 processes.
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
      yarn &&
      npm run build
    environment_slug: node-js
    envs:
      - key: REACT_APP_WEBSOCKET_HOST
        scope: RUN_AND_BUILD_TIME
        value: 0.0.0.0
      - key: REACT_APP_WEBSOCKET_PORT
        scope: RUN_AND_BUILD_TIME
        value: '80'
      - key: MONGODB_CONNECTION_STRING
        scope: RUN_AND_BUILD_TIME
        value: '' # ENCRYPTED VALUE
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

## MongoDB

Connect to a MongoDB cloud platform:

1. Create a new MongoDB cluster on a cloud platform such as [MongoDB Atlas](https://www.mongodb.com/atlas).
2. Update the `MONGODB_CONNECTION_STRING` environment variable on the em server.
3. Restart the em server.

Troubleshooting:

- If you get: `Error during saving transaction MongoServerSelectionError: Client network socket disconnected before secure TLS connection was established`
  - ...you need to whitelist the em server's IP address in the MongoDB dashboard.
  - Note: DigitalOcean does [not yet support static IP addresses](https://ideas.digitalocean.com/app-platform/p/app-platform-static-ip) on App Platform.

## Environment Variables

## Local

```ini
# .env.production
REACT_APP_WEBSOCKET_HOST=app12345.ondigitalocean.app/
REACT_APP_WEBSOCKET_PORT=80
```

## Cloud

The server uses its own environment variables for configuration (not to be confused with the `.env` files on the front-end).

- `process.env.HOST` - localhost
- `process.env.PORT` - 3001
- `process.env.REDIS_HOST` - Redis host name. If none is provided, the Redis extension will be disabled.
- `process.env.REDIS_PORT` - Redis port.
- `process.env.MONGODB_CONNECTION_STRING` - MongoDB [connection string](https://www.mongodb.com/docs/manual/reference/connection-string/). Default: mongodb://localhost:27017
