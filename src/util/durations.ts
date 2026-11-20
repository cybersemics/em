import durationsConfig from '../durations.config'
import testFlags from '../e2e/testFlags'

/** Initialize duration helper. */
function init() {
  /** Return production timing when animations are enabled, otherwise zero. */
  const durationOrZero = (duration: number) => (testFlags.animationEnabled ? duration : 0)

  /** Returns the duration for a particular key or undefined if it doesn't exist. */
  const get = (key: keyof typeof durationsConfig): number => {
    return durationOrZero(durationsConfig[key])
  }
  /** Returns the duration config with the durations or zero depending on whether animations are enabled. */
  const reduceDurations = (pv: Record<string, number>, [key, duration]: [string, number]) => {
    pv[key] = durationOrZero(duration)

    return pv
  }
  /** Returns all durations. */
  const getAll = () => Object.entries(durationsConfig).reduce(reduceDurations, {})

  return {
    get,
    getAll,
  }
}

const durations = init()

export type Duration = keyof typeof durationsConfig

export default durations
