import { clearActionCreator as clear } from '../actions/clear'
import { TUTORIAL_STEP_START } from '../constants'
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
   * AllowTutorial: Set to true to start the tutorial at its welcome step instead of skipping it, as START TUTORIAL on the welcome modal does.
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

  store.dispatch([
    // Start the tutorial at the welcome step, or skip it. The tutorial must be turned on explicitly rather than merely
    // not turned off: a skip is cached in storageCache.tutorialComplete, which survives clear, so after a file-level
    // initStore has skipped the tutorial, a nested initStore({ allowTutorial: true }) would otherwise leave it off.
    ...(allowTutorial
      ? [
          { type: 'tutorial', value: true },
          { type: 'tutorialStep', value: TUTORIAL_STEP_START },
        ]
      : [{ type: 'tutorial', value: false }]),

    // close welcome modal
    { type: 'closeModal' },
  ])
}

export default initStore
