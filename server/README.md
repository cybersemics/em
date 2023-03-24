em websocket server

## Development setup

```sh
npm run build
```

## Production setup

The server can be deployed on a hosting platform. The instructions below are for Digital Ocean.

Buildpacks:

    - Custom Build Command v0.1.1
    - Node.js v0.3.4
    - Procfile v0.0.3

Environment variables:

```
REACT_APP_WEBSOCKET_HOST=app12345.ondigitalocean.app/
REACT_APP_WEBSOCKET_PORT=80
```

App spec:

```
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
    value: "80"
  github:
    branch: dev
    deploy_on_push: true
    repo: cybersemics/em
  health_check: {}
  http_port: 8080
  instance_count: 1
  instance_size_slug: basic-xxs
  name: em
  routes:
  - path: /
  run_command: cd server && HOST=0.0.0.0 PORT=8080 npm run start
  source_dir: /
```

## Running the server

em will automatically connect to the websocket server when running on the specified host and port.

```sh
npm start
```

The server uses pm2 to manage running server processes.

Some available commands:

- `pm2 logs pm2.config.js`
- `pm2 reload pm2.config.js`
- `pm2 start pm2.config.js`
- `pm2 stop pm2.config.js`

With timestamps:

```sh
LOG_TIMESTAMPS=1 npm run start
```

## Environment Variables

The server uses environment variables for configuration.

Available environment variables and defaults are listed below:

- `process.env.DB_DOCLOGMETA` - [none]
- `process.env.HOST` - localhost
- `process.env.LOG_TIMESTAMPS` - [none]
- `process.env.POST` - 8080
- `process.env.YPERMISSIONS` - [none]
- `process.env.YPERSISTENCE` - [none]
