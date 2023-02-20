import Thunk from '../@types/Thunk'
import storage from '../util/storage'

/** Updates the tutorial. Waits for tutorial settings to load first. */
const tutorial =
  ({ value }: { value: boolean }): Thunk =>
  async (dispatch, getState) => {
    // TODO: Consolidate with cached Settings
    storage.setItem('Settings/Tutorial', value ? 'On' : 'Off')
    dispatch({ type: 'tutorial', value })
  }

export default tutorial
