import _ from 'lodash'
import State from '../@types/State'
import Thunk from '../@types/Thunk'
import storage from '../util/storage'

/**
 * Closes a modal temporarily.
 */
const closeModal = (state: State) => {
  return {
    ...state,
    showModal: null,
  }
}

/** Action-creator for closeModal. */
export const closeModalActionCreator = (): Thunk => (dispatch, getState) => {
  const state = getState()
  // permanently clear welcome modal
  if (state.showModal === 'welcome') {
    storage.setItem('welcomeComplete', '1')
  }
  dispatch({ type: 'closeModal' })
}

export default _.curryRight(closeModal)
