import FakeTimer, { InstalledClock } from '@sinonjs/fake-timers'

/**
 * Wraps sinon fake clock to reuse in a test file.
 */
const testTimer = () => {
  // eslint-disable-next-line fp/no-let
  let clock: InstalledClock | null = null

  /**
   * Install timer.
   */
  const useFakeTimer = () => {
    if (!clock) clock = FakeTimer.install()
  }

  /**
   * Remove timer and use real timer instead.
   */
  const useRealTimer = () => {
    if (clock) {
      clock.uninstall()
      clock = null
    }
  }

  /** Run all async. */
  const runAllAsync = async () => {
    if (clock) return clock.runAllAsync()
    else console.warn('runAllAsync: Fake clock has not been installed')
  }

  return {
    useFakeTimer,
    useRealTimer,
    runAllAsync,
  }
}

export default testTimer
