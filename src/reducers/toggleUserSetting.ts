import { toggleThought } from '.'
import _ from 'lodash'
import Path from '../@types/Path'
import State from '../@types/State'
import Thunk from '../@types/Thunk'
import { EM_TOKEN, Settings } from '../constants'
import findDescendant from '../selectors/findDescendant'

/** Toggles a user setting on/off. */
const toggleUserSetting = (state: State, { key, value }: { key: Settings; value?: boolean }) => {
  const settingsId = findDescendant(state, EM_TOKEN, 'Settings')!
  const settingsPath = [EM_TOKEN, settingsId] as Path
  const exists = !!findDescendant(state, settingsId, key)
  return value === undefined || (value ? !exists : exists)
    ? toggleThought(state, { path: settingsPath, value: key })
    : state
}

/** Action-creator for toggleThought. */
export const toggleUserSettingActionCreator =
  (payload: Parameters<typeof toggleUserSetting>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'toggleUserSetting', ...payload })

export default _.curryRight(toggleUserSetting)
