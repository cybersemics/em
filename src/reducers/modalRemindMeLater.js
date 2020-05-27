// util
import {
  modalCleanup,
} from '../util'

/**
 * Closes a modal temporarily.
 */
export default (state, { id, duration = 0 }) => {

  const time = Date.now() + duration

  modalCleanup()

  return {
    ...state,
    showModal: null,
    modals: {
      ...state.modals,
      [id]: {
        ...state.modals[id],
        hideuntil: time
      }
    }
  }
}
