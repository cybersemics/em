import { clearActionCreator as clear } from '../actions/clear'
import { thoughtspaceRuntime } from '../data-providers/thoughtspace'
import store from '../stores/app'
import waitForThoughtspaceIdle from './waitForThoughtspaceIdle'
import { resetStores } from '../stores/ministore'

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
