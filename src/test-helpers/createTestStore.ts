import { clearActionCreator as clear } from '../actions/clear'
import store from '../stores/app'

/**
 * Returns new store for test.
 */
export default function createTestStore() {
  store.dispatch(clear())
  store.dispatch([
    // skip tutorial
    { type: 'tutorial', value: false },

    // close welcome modal
    { type: 'closeModal' },
  ])

  return store
}
