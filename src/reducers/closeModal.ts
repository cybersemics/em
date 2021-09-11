import _ from 'lodash'
import modalCleanup from '../device/modalCleanup'
import { State } from '../@types'

/**
 * Closes a modal temporarily.
 */
const closeModal = (state: State) => {
  modalCleanup()

  return {
    ...state,
    showModal: null,
  }
}

export default _.curryRight(closeModal)
