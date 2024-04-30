A websocket server that synchronizes thoughts between multiple devices and users.

The app will automatically connect to the server specified by the client-side env variables `VITE_WEBSOCKET_HOST` and `VITE_WEBSOCKET_PORT` (see [client](https://github.com/cybersemics/em/tree/staging2/server#client)).

# Local Development

## Setup

1. `yarn`
1. `npm run build`
1. _optional:_ Install MongoDB (see [below](#mongodb))
   - Add the connection string to the server env variable (see [server](https://github.com/cybersemics/em/tree/staging2/server#server))

## Running the server

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

## Testing with live staging or production data

Normally in local development the app connects to the local websocket server and database. To test with live staging or production data, override `VITE_WEBSOCKET_HOST` in `.env.development` with the value from `.env.production` or `.env.staging` and restart localhost. It is recommended that you run the app on a different port to ensure that local storage stays sandboxed, i.e. `PORT=3012 npm start`.

Note: `NODE_ENV` itself cannot be manually overwritten, and is set based on how the server is started:

- `npm start` → **development**
- `npm test` → **test**
- `npm run build` → **production**

For additional information about how environment variables are used on the client-side, see: https://create-react-app.dev/docs/adding-custom-environment-variables/.

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
      - key: VITE_WEBSOCKET_HOST
        scope: RUN_AND_BUILD_TIME
        value: 0.0.0.0
      - key: VITE_WEBSOCKET_PORT
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

## Environment Variables

### Client

The client-side app needs the following envirionment variables set to connect to the websocket server. They are stored in `.env` files and embedded in the static build by react-scripts. See: https://create-react-app.dev/docs/adding-custom-environment-variables/#what-other-env-files-can-be-used.

```ini
VITE_WEBSOCKET_HOST=app12345.ondigitalocean.app
VITE_WEBSOCKET_PORT=
```

### Server

The server uses its own environment variables for configuration (not to be confused with the `.env` files on the front-end). You can run the em server locally without setting any env variables. When deploying to a hosting platform, set the appropriate env variables in the platform's secure dashboard.

- `process.env.HOST` - Default: `localhost`. DigitalOcean uses `0.0.0.0`.
- `process.env.PORT` - Default: `3001`. Should be kept empty for DigitalOcean.
- `process.env.REDIS_HOST` - Redis host name. If none is provided, the Redis extension will be disabled.
- `process.env.REDIS_PORT` - Redis port.
- `process.env.MONGODB_CONNECTION_STRING` - MongoDB [connection string](https://www.mongodb.com/docs/manual/reference/connection-string/).
  - Local: `mongodb://localhost:27017` (default)
  - Cloud: `mongodb+srv://USER:PASSWORD@cluster0.2dxe1jb.mongodb.net/em?retryWrites=true&w=majority`
  - Note: The recommended connection strings from MongoDB Atlas do not work. This is probably due to the way that mongoist connects to mongodb within y-mongodb-provider.
- `process.env.GRAPHITE_URL` - Metrics endpoint.
- `process.env.GRAPHITE_USERID` - Metrics user id.
- `process.env.GRAPHITE_APIKEY` - Metrics cloud access policy token.
- `process.env.METRICS_USERNAME` - Basic auth username for /metrics endpoint.
- `process.env.METRICS_PASSWORD` - Basic auth password for /metrics endpoint.

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
  - Note: DigitalOcean does [not yet support static IP addresses](https://ideas.digitalocean.com/app-platform/p/app-platform-static-ip) on App Platform. You can get the current IP address by running `curl ifconfig.me` from the console, but it will change every deploy.
- If you get `MongoError: bad auth : Authentication failed`
  - Make sure the user has been added with the correct permissions to the MongoDB hosting platform, and that your connection string is correct. See [Environment Variables](#environment-variables) for details.
- You may find it useful to browse the database using [MongoDB Compass](https://www.mongodb.com/products/tools/compass).
