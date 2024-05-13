import _ from 'lodash'
import State from '../@types/State'
import Thunk from '../@types/Thunk'
import { EM_TOKEN } from '../constants'
import findDescendant from '../selectors/findDescendant'
import toggleAttribute from './toggleAttribute'

/** Sets a setting thought. */
const settings = (state: State, { key, value }: { key: string; value: string }) => {
  const emContext = ['Settings', key, value]
  const exists = !!findDescendant(state, EM_TOKEN, emContext)
  return exists ? state : toggleAttribute(state, { path: [EM_TOKEN], values: emContext })
}

/** Action-creator for settings. */
export const settingsActionCreator =
  (payload: Parameters<typeof settings>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'settings', ...payload })

export default _.curryRight(settings)
