import durationsConfig from '../durations.config'

/** Initialize duration helper. */
function init() {
  // Guarded because constants.ts pulls this module in, and constants.ts is imported by the Node-side
  // e2e helpers where navigator does not exist.
  let inTest: boolean = typeof navigator !== 'undefined' && !!navigator.webdriver
  /** Check if we're in e2e tests and return zero if we are else return the actual duration. */
  const durationOrZero = (duration: number) => (inTest ? 0 : duration)

  /** Returns the duration for a particular key or undefined if it doesn't exist. */
  const get = (key: keyof typeof durationsConfig): number => {
    return durationOrZero(durationsConfig[key])
  }
  /** Returns the duration config with the durations or zero depending on whether we're in tests or not. */
  const reduceDurations = (pv: Record<string, number>, [key, duration]: [string, number]) => {
    pv[key] = durationOrZero(duration)

    return pv
  }
  /** Returns all durations. */
  const getAll = () => Object.entries(durationsConfig).reduce(reduceDurations, {})

  /** Override inTest state. Should only be used for testing purposes. */
  const setInTest = (inTestOverride: boolean) => {
    inTest = inTestOverride
  }

  return {
    get,
    getAll,
    setInTest,
  }
}

const durations = init()

export type Duration = keyof typeof durationsConfig

export default durations
