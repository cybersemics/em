import durations, { type DurationConfig } from '../durations.config'

/** Initialize duration helper. */
function init() {
  let inTest = navigator.webdriver

  /** Returns the duration for a particular key or undefined if it doesn't exist. */
  const get = (key: string): number | undefined => (durations[key] ? durationOrZero(durations[key]) : undefined)

  /** Returns all durations. */
  const getAll = (): DurationConfig => Object.entries(durations).reduce(reduceDurations, {})

  /** Override inTest state. Should only be used for testing purposes. */
  const forceInTest = () => {
    inTest = true
  }

  /** Returns the duration config with the durations or zero depending on whether we're in tests or not. */
  const reduceDurations = (pv: Record<string, number>, [key, duration]: [string, number]) => {
    pv[key] = durationOrZero(duration)

    return pv
  }

  /** Check if we're in e2e tests and return zero if we are else return the actual duration. */
  const durationOrZero = (duration: number) => (inTest ? 0 : duration)

  return {
    get,
    getAll,
    forceInTest,
  }
}

export default init
