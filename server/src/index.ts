import { Redis } from '@hocuspocus/extension-redis'
import { Server } from '@hocuspocus/server'
import bodyParser from 'body-parser'
import { EventEmitter } from 'events'
import express from 'express'
import basicAuth from 'express-basic-auth'
import expressWebsockets from 'express-ws'
import client, { register } from 'prom-client'
import observe, { observeNodeMetrics } from './metrics'

// bump maxListeners to avoid warnings when many websocket connections are created
EventEmitter.defaultMaxListeners = 1000000

/** Frequency of pushing Hocuspocus metrics to Graphite. Observations are concatenated, throttled, and ultimately pushed on the base reporting interval in metrics.ts. */
const HOCUSPOCUS_METRICS_INTERVAL = 1000

const METRICS_DISABLED_MESSAGE =
  'The /metrics endpoint is disabled because METRICS_USERNAME and METRICS_PASSWORD environment variables are not set.'

const redisHost = process.env.REDIS_HOST
const redisPort = process.env.REDIS_PORT ? +process.env.REDIS_PORT : undefined
const port = process.env.PORT ? +process.env.PORT : 3001
const hasGraphiteCredentials = !!(
  process.env.GRAPHITE_URL &&
  process.env.GRAPHITE_USERID &&
  process.env.GRAPHITE_APIKEY
)
const hasMetricsCredentials = !!(process.env.METRICS_USERNAME && process.env.METRICS_PASSWORD)
const nodeEnv = process.env.NODE_ENV?.toLowerCase() || 'development'

client.collectDefaultMetrics()

if (!hasMetricsCredentials && nodeEnv !== 'development') {
  console.warn(METRICS_DISABLED_MESSAGE)
}

// Metrics are usually exposed on the /metrics route with basic auth.
// We can also opt in to pushing them directly to the Graphite server on an interval.
// This is useful for exposing metrics from a local development environment.
if (hasGraphiteCredentials && process.env.METRICS_PUSH) {
  console.info(`Pushing NodeJS metrics to ${process.env.GRAPHITE_URL}`)
  observeNodeMetrics()
}

const server = Server.configure({
  port,
  extensions: [...(redisHost ? [new Redis({ host: redisHost, port: redisPort })] : [])],
})

// Hocuspocus server metrics
setInterval(() => {
  observe({ name: 'em.server.hocuspocus.connections', value: server.getConnectionsCount() })
  observe({ name: 'em.server.hocuspocus.documents', value: server.getDocumentsCount() })
}, HOCUSPOCUS_METRICS_INTERVAL)

// express
const { app } = expressWebsockets(express())
app.use(bodyParser.text())

// basic auth middleware to protect the metrics endpoint
const metricsAuthMiddleware = basicAuth({
  users: {
    ...(hasMetricsCredentials ? { [process.env.METRICS_USERNAME!]: process.env.METRICS_PASSWORD! } : null),
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  unauthorizedResponse: (req: any): string =>
    !hasMetricsCredentials ? METRICS_DISABLED_MESSAGE : !req.auth ? 'Basic auth required' : 'Unauthorized',
})

app.get('/', async (req, res) => {
  res.type('text').send('Server is running')
})

// prometheus metrics route
app.get('/metrics', metricsAuthMiddleware, async (req, res) => {
  res.contentType(register.contentType).send(await register.metrics())
})

// hocuspocus websocket route
app.ws('/hocuspocus', (ws, req) => {
  server.handleConnection(ws, req)
})

app.listen(port, () => {
  console.info(`App listening at http://localhost:${port}`)
  process.send?.('ready')
})
