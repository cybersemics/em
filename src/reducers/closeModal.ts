import _ from 'lodash'
import { modalCleanup } from '../util'
import { State } from '../util/initialState'

/**
 * Closes a modal temporarily.
 */
const closeModal = (state: State, { id }: { id?: string }) => {

  modalCleanup()

  return {
    ...state,
    showModal: null,
    modals: {
      ...state.modals,
      [id ?? state.showModal!]: {
        ...state.modals[id ?? state.showModal!]
      }
    }
  }
}

export default _.curryRight(closeModal)
