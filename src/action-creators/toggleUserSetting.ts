import Thunk from '../@types/Thunk'
import toggleUserSetting from '../reducers/toggleUserSetting'

/** Action-creator for toggleThought. */
const toggleUserSettingActionCreator =
  (payload: Parameters<typeof toggleUserSetting>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'toggleUserSetting', ...payload })

export default toggleUserSettingActionCreator
