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

```ini
REACT_APP_WEBSOCKET_HOST=app12345.ondigitalocean.app/
REACT_APP_WEBSOCKET_PORT=80

# node-s3-cli for backups
# https://github.com/raineorshine/node-s3-cli
AWS_ACCESS_KEY=
AWS_SECRET_KEY=
AWS_ENDPOINT=nyc3.digitaloceanspaces.com
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
  http_port: 3001
  instance_count: 1
  instance_size_slug: basic-xxs
  name: em
  routes:
  - path: /
  run_command: cd server && HOST=0.0.0.0 PORT=3001 npm run start
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

## Environment Variables

The server uses environment variables for configuration.

Available environment variables and defaults are listed below:

- `process.env.DB_DOCLOGMETA` - data/doclogmeta.level
- `process.env.HOST` - localhost
- `process.env.POST` - 3001
- `process.env.DB_PERMISSIONS` - data/permissions.level
- `process.env.DB_THOUGHTSPACE` - data/thoughts/
- `process.env.AWS_ACCESS_KEY`
- `process.env.AWS_SECRET_KEY`
- `process.env.AWS_ENDPOINT`

Note: `npm run clear` only clears the default db locations. If you override `DB_DOCLOGMETA`, `DB_PERMISSIONS`, or `DB_THOUGHTSPACE`, you will need to manually delete the db files.

# Backups

```
cd server

# config (enter AWS api key and secret)
echo "[default]
access_key=
secret_key=
endpoint=nyc3.digitaloceanspaces.com" > .s3cfg
vi .s3cfg

# backup to S3 endpoint (DigitalOcean Spaces)
scripts/backup.sh
```
