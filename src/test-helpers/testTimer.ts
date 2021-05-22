/* eslint-disable react-hooks/rules-of-hooks */
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

  /** Sets the fake timer, runs the code, flushes all the pending timers and the sets back the real timer. */
  const runAsyncCode = async (fn: () => void) => {
    useFakeTimer()
    fn()
    await runAllAsync()
    useRealTimer()
  }

  return {
    useFakeTimer,
    useRealTimer,
    runAllAsync,
    runAsyncCode
  }
}

export default testTimer
