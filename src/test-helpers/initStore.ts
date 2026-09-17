import { clearActionCreator as clear } from '../actions/clear'
import { thoughtspaceRuntime } from '../data-providers/thoughtspace'
import store from '../stores/app'
import { resetStores } from '../stores/ministore'
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
  // Use fake timers so that the in-memory thoughtspace's asynchronous work is flushed only when a test advances the
  // clock (see docs/testing.md § Fake timers). Without them, dropping and reinitializing the thoughtspace below races
  // the tests that follow ("TreeCRDT DataProvider: init not called"). Pending throttles are not the reason: those are
  // cancelled at every test boundary regardless of timers (cancelOnReset).
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
