import _ from 'lodash'
import State from '../@types/State'
import Thunk from '../@types/Thunk'
import storage from '../util/storage'
import settings from './settings'

/** Sets the Tutorial setting value. */
const tutorial = (state: State, { value }: { value?: boolean }) => ({
  ...settings(state, {
    key: 'Tutorial',
    value: value ? 'On' : 'Off',
  }),
  // disable isLoading when dismissing the tutorial, since we can assume this is a new thoughtspace or the thoughtspace has already been loaded
  isLoading: state.isLoading && value,
})

/** Updates the tutorial. Waits for tutorial settings to load first. */
export const tutorialActionCreator =
  ({ value }: { value: boolean }): Thunk =>
  async (dispatch, getState) => {
    // TODO: Consolidate with cached Settings
    storage.setItem('Settings/Tutorial', value ? 'On' : 'Off')
    dispatch({ type: 'tutorial', value })
  }

export default _.curryRight(tutorial)
