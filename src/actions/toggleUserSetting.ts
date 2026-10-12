import { toggleThought } from '.'
import Path from '../@types/Path'
import State from '../@types/State'
import ThoughtspaceTransaction from '../@types/ThoughtspaceTransaction'
import Thunk from '../@types/Thunk'
import { EM_TOKEN, Settings } from '../constants'
import findDescendant from '../selectors/findDescendant'
import { registerActionMetadata } from '../util/actionMetadata.registry'
import command from '../util/command'

/** Toggles a user setting on/off. */
const toggleUserSetting = (
  state: State,
  { key, value }: { key: Settings; value?: boolean },
  transaction?: ThoughtspaceTransaction,
) => {
  const settingsId = findDescendant(state, EM_TOKEN, 'Settings')!
  const settingsPath = [EM_TOKEN, settingsId] as Path
  const exists = !!findDescendant(state, settingsId, key)
  return value === undefined || (value ? !exists : exists)
    ? toggleThought(state, { path: settingsPath, value: key }, transaction)
    : state
}

/** An action-creator that toggles a user setting on/off. */
export const toggleUserSettingActionCreator =
  (payload: Parameters<typeof toggleUserSetting>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'toggleUserSetting', ...payload })

export default command(toggleUserSetting)

// Register this action's metadata
registerActionMetadata('toggleUserSetting', {
  undoable: false,
})
