import State from '../@types/State'
import ThoughtspaceTransaction from '../@types/ThoughtspaceTransaction'
import Thunk from '../@types/Thunk'
import { EM_TOKEN, SETTINGS_TOKEN, SETTINGS_VALUE } from '../constants'
import findDescendant from '../selectors/findDescendant'
import getFirstChildPlacement from '../selectors/getFirstChildPlacement'
import { registerActionMetadata } from '../util/actionMetadata.registry'
import command from '../util/command'
import createThought from './createThought'
import toggleAttribute from './toggleAttribute'

/** Sets a setting thought. */
const settings = (
  state: State,
  { key, value }: { key: string; value: string },
  transaction?: ThoughtspaceTransaction,
) => {
  const emContext = [SETTINGS_VALUE, key, value]
  const exists = !!findDescendant(state, EM_TOKEN, emContext)
  if (exists) return state

  const stateWithSettings = findDescendant(state, EM_TOKEN, SETTINGS_VALUE)
    ? state
    : createThought(
        state,
        {
          id: SETTINGS_TOKEN,
          path: [EM_TOKEN],
          value: SETTINGS_VALUE,
          afterId: getFirstChildPlacement(state, EM_TOKEN),
        },
        transaction,
      )

  return toggleAttribute(stateWithSettings, { path: [EM_TOKEN], values: emContext }, transaction)
}

/** Action-creator for settings. */
export const settingsActionCreator =
  (payload: Parameters<typeof settings>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'settings', ...payload })

export default command(settings)

// Register this action's metadata
registerActionMetadata('settings', {
  undoable: true,
})
