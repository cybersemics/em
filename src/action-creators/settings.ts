import Thunk from '../@types/Thunk'
import settings from '../reducers/settings'

/** Action-creator for settings. */
const settingsActionCreator =
  (payload: Parameters<typeof settings>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'settings', ...payload })

export default settingsActionCreator
