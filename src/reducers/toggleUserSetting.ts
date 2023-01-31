import { toggleThought } from '.'
import _ from 'lodash'
import Path from '../@types/Path'
import State from '../@types/State'
import { EM_TOKEN, Settings } from '../constants'
import findDescendant from '../selectors/findDescendant'

/** Toggles a user setting on/off. */
const toggleUserSetting = (state: State, { key }: { key: Settings }) => {
  const settingsId = findDescendant(state, EM_TOKEN, 'Settings')!
  const settingsPath = [EM_TOKEN, settingsId] as Path
  return toggleThought(state, { path: settingsPath, value: key })
}

export default _.curryRight(toggleUserSetting)
