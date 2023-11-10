import { groupBy } from 'lodash'
import { register } from 'prom-client'
import Index from '../../src/@types/IndexType'
import keyValueBy from '../../src/util/keyValueBy'
import throttleConcat from '../../src/util/throttleConcat'
import './env'

// import is not working in commonjs build
// require only works with node-fetch v2
// eslint-disable-next-line @typescript-eslint/no-var-requires
const fetch = require('node-fetch')

// MetricType enum does not seem to be properly exported from prom-client.
// https://github.com/siimon/prom-client/issues/336
const MetricType: Index<any> = {
  Counter: 'counter',
  Gauge: 'gauge',
  Histogram: 'histogram',
  Summary: 'summary',
}

/** Allowed metrics names. These are queried by the Graphite dashboard. */
type MetricsName =
  | 'em.server.permissions'
  | 'em.server.save'
  | 'em.server.load'
  | `em.server.hocuspocus.${string}`
  | `em.server.node.${string}`

/** The Graphite metrics interval that observations are aligned with. Multiple observations within the same interval will only result in one data point. Missing an interval will result in a gap. */
const BASE_REPORTING_INTERVAL = 1

const apiUrl = process.env.GRAPHITE_URL
const bearer = `${process.env.GRAPHITE_USERID}:${process.env.GRAPHITE_APIKEY}`
const nodeEnv = process.env.NODE_ENV?.toLowerCase() || 'development'

const hasGraphiteCredentials = process.env.GRAPHITE_URL && process.env.GRAPHITE_USERID && process.env.GRAPHITE_APIKEY
if (!hasGraphiteCredentials) {
  console.warn(
    'Hocuspocus server metrics are disabled because GRAPHITE_URL, GRAPHITE_USERID, and/or GRAPHITE_APIKEY environment variables are not set.',
  )
}

/** Calculate the meaen of a list of values. Returns undefined if the list is empty. */
const mean = (values: number[]) => (values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : undefined)

/** Push metrics to the Graphite API. Null or undefined tags are ignored. */
const observe = async (
  observations: { name: MetricsName; value: number; tags?: Index<string | null | undefined> }[],
): Promise<void> => {
  const observationsNormalized = observations.map(({ name, value, tags }) => {
    // get current unix timestamp, rounded down to the nearest second
    const time = Math.floor(Date.now() / 1000)
    const tagsArray = Object.entries({ ...tags, env: nodeEnv })
      .filter(([key, value]) => value != null)
      .map(([key, value]) => `${key}=${value}`)

    const data = {
      interval: BASE_REPORTING_INTERVAL,
      name,
      // Note: For some reason metrics without any tags do not show up in Graphite.
      // It seems related to the fact that name is stored as a tag, so perhaps if there are no tags, the name is not stored.
      // Since we always have at least one tag (env), this is not a problem here.
      tags: tagsArray,
      // align timestamp to interval
      time: Math.floor(time / BASE_REPORTING_INTERVAL) * BASE_REPORTING_INTERVAL,
      value,
    }
    return data
  })

  try {
    await fetch(apiUrl, {
      method: 'POST',
      headers: { Authorization: `Bearer ${bearer}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(observationsNormalized),
    })
  } catch (err: any) {
    console.error(`Error pushing metrics to ${apiUrl}`, err.message)
  }
}

const observeThrottled = throttleConcat(
  (
    observations: {
      name: MetricsName
      value: number
      tags?: Index<string | null | undefined>
    }[],
  ) => {
    // group by name + tags
    const groups = groupBy(observations, ({ name, value, tags }) => JSON.stringify({ name, tags }))

    // calculate the mean time for each group
    const meanObservations = Object.values(groups).map(groupObservations => {
      // group observations all have the same name and tags, since that is how they were grouped
      const { name, tags } = groupObservations[0]
      const values = groupObservations.map(({ value }) => value)
      // !: values is never empty because throttleConcat is called only when args is not empty
      return { name, value: mean(values)!, tags }
    })

    observe(meanObservations)
  },
  BASE_REPORTING_INTERVAL * 1000,
  { leading: false },
)

// noop if env vars are not set
const observeMetric = hasGraphiteCredentials
  ? observeThrottled
  : // eslint-disable-next-line @typescript-eslint/no-empty-function
    () => {}

/**
 * Push default metrics to Grafana on an interval. The function client.collectDefaultMetrics must already have been called.
 *
 * @see https://github.com/siimon/prom-client#default-metrics
 */
export const observeNodeMetrics = () => {
  setInterval(async () => {
    const json = await register.getMetricsAsJSON()

    // convert prom-client JSON to Graphite format
    const metrics = json
      // Only support for Counter and Gauge currently.
      // TODO: Add support for Histogram, which is how nodejs_gc_duration_seconds is reported.
      .filter(({ type }) => !type || type === MetricType.Counter || type === MetricType.Gauge)
      .flatMap(({ aggregator, help, name, type, values }) =>
        values.map(({ value, labels }) => ({
          name: `em.server.node.${name}` as const,
          value: values[0]?.value,
          tags: keyValueBy(labels, (key, value) => ({ [key]: value?.toString() })),
        })),
      )

    metrics.forEach(observeThrottled)
  }, BASE_REPORTING_INTERVAL * 1000)
}

export default observeMetric
