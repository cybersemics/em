/* eslint-disable @typescript-eslint/no-use-before-define */
import durationsConfig from '../durations.config'

/** Initialize duration helper. */
function init() {
  let inTest: boolean = !!navigator.webdriver

  /** Returns the duration for a particular key or undefined if it doesn't exist. */
  const get = (key: keyof typeof durationsConfig): number => {
    return durationOrZero(durationsConfig[key])
  }

  /** Returns all durations. */
  const getAll = () => Object.entries(durationsConfig).reduce(reduceDurations, {})

  /** Override inTest state. Should only be used for testing purposes. */
  const setInTest = (inTestOverride: boolean) => {
    inTest = inTestOverride
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
    setInTest,
  }
}

const durations = init()

export default durations
