import _ from 'lodash'
import State from '../@types/State'
import Thunk from '../@types/Thunk'
import storage from '../util/storage'

/** Toggles the Split View. */
const toggleSplitView = (state: State, { value }: { value?: boolean }) => ({
  ...state,
  showSplitView: value == null ? !state.showSplitView : value,
})

/** Action-creator for toggleSplitView. */
export const toggleSplitViewActionCreator =
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

export default _.curryRight(toggleSplitView)
