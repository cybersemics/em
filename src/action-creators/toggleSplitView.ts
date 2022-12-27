import Thunk from '../@types/Thunk'
import storage from '../util/storage'

/** Action-creator for toggleSplitView. */
const toggleSplitViewActionCreator =
  ({ value }: { value?: boolean }): Thunk =>
  (dispatch, getState) => {
    const state = getState()
    const valueNew = value ?? !state.showSplitView
    if (valueNew) {
      storage.setItem('showSplitView', 'true')
    } else {
      storage.removeItem('showSplitView')
    }
    dispatch({ type: 'toggleSplitView', value: valueNew })
  }

export default toggleSplitViewActionCreator
