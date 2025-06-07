An HTTP server that provides AI services to em.

# Local Development

## Setup

1. `yarn`
1. `yarn build`

## Running the server

The server process is managed by pm2, which restarts the server if it crashes.

```sh
yarn start
```

Usually you will want to monitor the server logs while it is running:

```sh
yarn logs
```

Other npm scripts:

- `logs` - Stream the server logs.
- `restart` - Restart the server.
- `start` - Start the server using pm2.
- `status` - Show the pm2 process status.
- `stop` - Stop the server.

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
      cd packages/ai &&
      yarn &&
      yarn build
    environment_slug: node-js
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
    run_command: cd packages/ai && HOST=0.0.0.0 PORT=3001 yarn start
    source_dir: /
```

## Environment Variables

You can run the em server locally without setting any env variables. When deploying to a hosting platform, set the appropriate env variables in the platform's secure dashboard.

- `process.env.HOST` - Default: `localhost`. DigitalOcean uses `0.0.0.0`.
- `process.env.PORT` - Default: `3001`. Should be kept empty for DigitalOcean.
- `process.env.GRAPHITE_URL` - Metrics endpoint.
- `process.env.GRAPHITE_USERID` - Metrics user id.
- `process.env.GRAPHITE_APIKEY` - Metrics cloud access policy token.
- `process.env.METRICS_USERNAME` - Basic auth username for /metrics endpoint.
- `process.env.METRICS_PASSWORD` - Basic auth password for /metrics endpoint.
- `process.env.OPENAI_API_KEY` - OpenAI API Key.
