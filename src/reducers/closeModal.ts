import _ from 'lodash'
import { State } from '../@types'
import { modalCleanup } from '../util'

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
