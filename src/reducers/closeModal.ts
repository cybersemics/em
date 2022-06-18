import _ from 'lodash'
import State from '../@types/State'

/**
 * Closes a modal temporarily.
 */
const closeModal = (state: State) => {
  return {
    ...state,
    showModal: null,
  }
}

export default _.curryRight(closeModal)
