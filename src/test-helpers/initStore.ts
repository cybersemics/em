import { clearActionCreator as clear } from '../actions/clear'
import store from '../stores/app'

interface Params {
  persist?: boolean
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
