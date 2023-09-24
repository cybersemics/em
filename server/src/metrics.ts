import { groupBy } from 'lodash'
import Index from '../../src/@types/IndexType'
import throttleConcat from '../../src/util/throttleConcat'
import './env'

// import is not working in commonjs build
// require only works with node-fetch v2
// eslint-disable-next-line @typescript-eslint/no-var-requires
const fetch = require('node-fetch')

const enabled = process.env.GRAPHITE_URL && process.env.GRAPHITE_USERID && process.env.GRAPHITE_APIKEY
if (!enabled) {
  console.warn(
    'Metrics are disabled because GRAPHITE_URL, GRAPHITE_USERID, and/or GRAPHITE_APIKEY environment variables are not set.',
  )
}

// report metrics every second
const REPORTING_INTERVAL = 1

const apiUrl = process.env.GRAPHITE_URL
const bearer = `${process.env.GRAPHITE_USERID}:${process.env.GRAPHITE_APIKEY}`

/** Calculate the meaen of a list of values. Returns undefined if the list is empty. */
const mean = (values: number[]) => (values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : undefined)

/** Push a metric to the Graphite API. Null or undefined tags are ignored. */
const observe = (name: string, value: number, tags: Index<string | null | undefined> = {}) => {
  // get current unix timestamp, rounded down to the nearest second
  const time = Math.floor(Date.now() / 1000)
  const tagsArray = Object.entries(tags)
    .filter(([key, value]) => value != null)
    .map(([key, value]) => `${key}=${value}`)

  const data = [
    {
      interval: REPORTING_INTERVAL,
      name,
      tags: tagsArray,
      // align timestamp to interval
      time: Math.floor(time / REPORTING_INTERVAL) * REPORTING_INTERVAL,
      value,
    },
  ]

  return fetch(apiUrl, {
    method: 'POST',
    headers: { Authorization: `Bearer ${bearer}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }).catch((err: any) => console.error(`Error pushing metrics to ${apiUrl}`, { name, tagsArray }, err))
}

const observeThrottled = throttleConcat(
  (observations: { name: string; value: number; tags?: Index<string | null | undefined> }[]) => {
    // group by name + tags
    const groups = groupBy(observations, ({ name, value, tags }) => JSON.stringify({ name, tags }))
    Object.values(groups).forEach(groupObservations => {
      const { name, tags } = groupObservations[0]
      // group observations all have the same name and tags, since that is how they were grouped
      const values = groupObservations.map(({ value }) => value)
      // !: values is never empty because throttleConcat is called only when args is not empty
      // truncate to three decimal places
      observe(name, Math.floor(mean(values)! * 1000) / 1000, tags)
    })
  },
  REPORTING_INTERVAL * 1000,
  { leading: false },
)

// noop if env vars are not set
const observeMetric = enabled
  ? observeThrottled
  : // eslint-disable-next-line @typescript-eslint/no-empty-function
    () => {}

export default observeMetric
