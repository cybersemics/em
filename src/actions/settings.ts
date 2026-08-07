import _ from 'lodash'
import State from '../@types/State'
import Thunk from '../@types/Thunk'
import { EM_TOKEN, SETTINGS_TOKEN, SETTINGS_VALUE } from '../constants'
import findDescendant from '../selectors/findDescendant'
import getPrevRank from '../selectors/getPrevRank'
import { registerActionMetadata } from '../util/actionMetadata.registry'
import createThought from './createThought'
import toggleAttribute from './toggleAttribute'

/** Sets a setting thought. */
const settings = (state: State, { key, value }: { key: string; value: string }) => {
  const emContext = [SETTINGS_VALUE, key, value]
  const exists = !!findDescendant(state, EM_TOKEN, emContext)
  if (exists) return state

  const stateWithSettings = findDescendant(state, EM_TOKEN, SETTINGS_VALUE)
    ? state
    : createThought(state, {
        id: SETTINGS_TOKEN,
        path: [EM_TOKEN],
        value: SETTINGS_VALUE,
        rank: getPrevRank(state, EM_TOKEN),
      })

  return toggleAttribute(stateWithSettings, { path: [EM_TOKEN], values: emContext })
}

/** Action-creator for settings. */
export const settingsActionCreator =
  (payload: Parameters<typeof settings>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'settings', ...payload })

export default _.curryRight(settings)

// Register this action's metadata
registerActionMetadata('settings', {
  undoable: true,
})
