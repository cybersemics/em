import { clearActionCreator as clear } from '../actions/clear'
import { thoughtspaceRuntime } from '../data-providers/thoughtspace'
import store from '../stores/app'
import { resetStores } from '../stores/ministore'
import storage from '../util/storage'
import waitForThoughtspaceIdle from './waitForThoughtspaceIdle'

interface Params {
  /**
   * Persist: Set to true to keep the existing store state.
   */
  persist?: boolean

  /**
   * AllowTutorial: Set to true to override the skipping of the tutorial.
   */
  allowTutorial?: boolean
}

/**
 * Initializes the store. Defaults to clearing the store and skipping the tutorial.
 */
const initStore = async ({ persist, allowTutorial }: Params = {}) => {
  // Use fake timers so throttled/debounced side effects (e.g., url/history updates, storage writes)
  // don't execute after the test completes and the environment is torn down.
  // This makes tests deterministic and prevents post-teardown access to window/localStorage.
  vi.useFakeTimers()

  if (!persist) {
    await waitForThoughtspaceIdle()
    await thoughtspaceRuntime.drop()
    await thoughtspaceRuntime.init({ storage: 'memory' })
    store.dispatch(clear())

    // Ministores are module-level singletons that vitest only isolates per test file, so reset them
    // alongside the Redux store to give each test the same clean slate.
    resetStores()

    // localStorage is likewise shared by every test in a file: nothing clears it between tests, so a value one test
    // persists (the AI disclosure acknowledgement, for one) is what the next test reads. cleanupTestApp clears it for
    // rendered suites; clear it here so both fixtures start from the same slate.
    storage.clear()
  }

  if (!allowTutorial) {
    store.dispatch([
      // skip tutorial
      { type: 'tutorial', value: false },

      // close welcome modal
      { type: 'closeModal' },
    ])
  }
}

export default initStore
