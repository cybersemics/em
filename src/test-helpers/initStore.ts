import { clearActionCreator as clear } from '../actions/clear'
import store from '../stores/app'

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
const initStore = ({ persist, allowTutorial }: Params = {}) => {
  // Use fake timers so throttled/debounced side effects (e.g., url/history updates, storage writes)
  // don't execute after the test completes and the environment is torn down.
  // This makes tests deterministic and prevents post-teardown access to window/localStorage.
  vi.useFakeTimers()

  if (!persist) store.dispatch(clear())

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
