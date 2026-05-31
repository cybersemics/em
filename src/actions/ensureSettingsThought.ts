import State from '../@types/State'
import { EM_TOKEN, SETTINGS_TOKEN, SETTINGS_VALUE } from '../constants'
import findDescendant from '../selectors/findDescendant'
import getPrevRank from '../selectors/getPrevRank'
import createThought from './createThought'

/** Ensures the fixed /EM/Settings system thought exists before adding concrete setting values below it. */
const ensureSettingsThought = (state: State): State =>
  findDescendant(state, EM_TOKEN, SETTINGS_VALUE)
    ? state
    : createThought(state, {
        id: SETTINGS_TOKEN,
        path: [EM_TOKEN],
        value: SETTINGS_VALUE,
        rank: getPrevRank(state, EM_TOKEN),
      })

export default ensureSettingsThought
