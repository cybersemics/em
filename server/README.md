A websocket server that automatically connects to the em front-end and syncs thoughts across devices.

# Setup

1. Install [MongoDB](#mongodb)
1. `yarn`
1. `npm run build`

# Running the server

The server process is managed by pm2, which restarts the server if it crashes.

```sh
npm start
```

Usually you will want to monitor the server logs while it is running:

```sh
npm run logs
```

Other npm scripts:

- `logs` - Stream the server logs.
- `restart` - Restart the server.
- `start` - Start the server using pm2.
- `status` - Show the pm2 process status.
- `stop` - Stop the server.

# Environment Variables

If you are setting up the em server locally, you do not need to set any environment variables. The defaults are sufficient.

For running the em server on a cloud hosting platform, see below.

### Client

The client-side app needs these envirionment variables set to connect to the websocket server. They are stored in `.env` files and embedded in the static build by react-scripts. See: https://create-react-app.dev/docs/adding-custom-environment-variables/#what-other-env-files-can-be-used.

```ini
# .env.production
REACT_APP_WEBSOCKET_HOST=app12345.ondigitalocean.app/
REACT_APP_WEBSOCKET_PORT=80
```

### Server

The server uses its own environment variables for configuration (not to be confused with the `.env` files on the front-end). The defaults are generally sufficient for running locally. When deploying to a hosting platform, they should be set within the platform's secure dashboard.

- `process.env.HOST` - Default: `localhost`. DigitalOcean uses `0.0.0.0`.
- `process.env.PORT` - Default: `3001`. DigitalOcean uses `80`.
- `process.env.REDIS_HOST` - Redis host name. If none is provided, the Redis extension will be disabled.
- `process.env.REDIS_PORT` - Redis port.
- `process.env.MONGODB_CONNECTION_STRING` - MongoDB [connection string](https://www.mongodb.com/docs/manual/reference/connection-string/).
  - Local: `mongodb://localhost:27017` (default)
  - Cloud: `mongodb+srv://USER:PASSWORD@cluster0.2dxe1jb.mongodb.net/em?retryWrites=true&w=majority`
  - Note: The recommended connection strings from MongoDB Atlas do not work. This is probably due to the way that mongoist connects to mongodb within y-mongodb-provider.

# Deploying to a hosting platform

The server can be deployed to a cloud hosting platform. The instructions below are for Digital Ocean.

### Buildpacks:

- Custom Build Command v0.1.1
- Node.js v0.3.4
- Procfile v0.0.3

### App spec:

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
        value: # ENCRYPTED
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

# MongoDB

### Local

1. Install [MongoDB Community Edition](https://www.mongodb.com/docs/manual/installation/).
2. Install [MongoDB Compass](https://www.mongodb.com/products/tools/compass) to browse the database.

### Cloud

1. Create a new MongoDB cluster on a cloud platform such as [MongoDB Atlas](https://www.mongodb.com/atlas).
2. Update the `MONGODB_CONNECTION_STRING` environment variable on the em server. See [Environment Variables](#environment-variables) for details.

Troubleshooting:

- If you get: `Error during saving transaction MongoServerSelectionError: Client network socket disconnected before secure TLS connection was established`
  - Whitelist the em server's IP address in the MongoDB hosting platform dashboard.
  - Note: DigitalOcean does [not yet support static IP addresses](https://ideas.digitalocean.com/app-platform/p/app-platform-static-ip) on App Platform.
- If you get `MongoError: bad auth : Authentication failed`
  - Make sure the user has been added with the correct permissions to the MongoDB hosting platform, and that your connection string is correct. See [Environment Variables](#environment-variables) for details.
- You may find it useful to browse the database using [MongoDB Compass](https://www.mongodb.com/products/tools/compass).
