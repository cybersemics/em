import _ from 'lodash'
import State from '../@types/State'
import { EM_TOKEN, Settings } from '../constants'
import findDescendant from './findDescendant'

/** Gets a boolean user setting from /EM/Settings. See ModalSettings for full descriptions. */
const getUserSetting = _.curryRight(
  (state: State, key: Settings) => !!findDescendant(state, EM_TOKEN, ['Settings', key]),
)

export default getUserSetting
