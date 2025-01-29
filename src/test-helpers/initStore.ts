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
