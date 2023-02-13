import Thunk from '../@types/Thunk'
import storage from '../util/storage'

/** Action-creator for closeModal. */
const closeModalActionCreator = (): Thunk => (dispatch, getState) => {
  const state = getState()
  // permanently clear welcome modal
  if (state.showModal === 'welcome') {
    storage.setItem('welcomeComplete', '1')
  }
  dispatch({ type: 'closeModal' })
}

export default closeModalActionCreator
