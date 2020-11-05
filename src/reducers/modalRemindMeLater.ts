import _ from 'lodash'
import { modalCleanup } from '../util'
import { State } from '../util/initialState'

/**
 * Closes a modal temporarily.
 */
const modalRemindMeLater = (state: State, { id, duration = 0 }: { id?: string, duration?: number }) => {

  const time = Date.now() + duration

  modalCleanup()

  return {
    ...state,
    showModal: null,
    modals: {
      ...state.modals,
      [id ?? state.showModal!]: {
        ...state.modals[id ?? state.showModal!],
        hideuntil: time
      }
    }
  }
}

export default _.curryRight(modalRemindMeLater)
