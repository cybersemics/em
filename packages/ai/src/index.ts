import bodyParser from 'body-parser'
import cors from 'cors'
import express, { Request, Response } from 'express'
import basicAuth from 'express-basic-auth'
import client, { register } from 'prom-client'
import prompt from './prompt'
import { observeNodeMetrics } from '../../../server/src/metrics'

const port = process.env.PORT ? +process.env.PORT : 3001

// express
const app = express()
app.use(bodyParser.text())

/***********************
 * Metrics
 ***********************/

const METRICS_DISABLED_MESSAGE =
  'The /metrics endpoint is disabled because METRICS_USERNAME and METRICS_PASSWORD environment variables are not set.'

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

// basic auth middleware to protect the metrics endpoint
const metricsAuthMiddleware = basicAuth({
  users: {
    ...(hasMetricsCredentials ? { [process.env.METRICS_USERNAME!]: process.env.METRICS_PASSWORD! } : null),
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  unauthorizedResponse: (req: any): string =>
    !hasMetricsCredentials ? METRICS_DISABLED_MESSAGE : !req.auth ? 'Basic auth required' : 'Unauthorized',
})

/***********************
 * Routes
 ***********************/

app.get('/', async (req, res) => {
  res.type('text').send('Server is running')
})

// prometheus metrics route
app.get('/metrics', metricsAuthMiddleware, async (req, res) => {
  res.contentType(register.contentType).send(await register.metrics())
})

app.post(
  '/ai',
  cors({
    // TODO
    // origin: /http:\/\/localhost:\d+/,
  }),
  // TODO
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async (req: Request<any, any, string, any>, res: Response<any>) => {
    if (!req.body) {
      return res.status(400).send('Missing req.body')
    }

    const result = await prompt(req.body)

    res
      .type('json')
      .status(result.err ? result.err.status : 200)
      .send(result)
  },
)

/***********************
 * Start server
 ***********************/

app.listen(port, () => {
  console.info(`App listening at http://localhost:${port}`)
  process.send?.('ready')
})
