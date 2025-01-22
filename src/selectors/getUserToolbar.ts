import CommandId from '../@types/CommandId'
import State from '../@types/State'
import { commandById } from '../commands'
import { EM_TOKEN } from '../constants'
import findDescendant from './findDescendant'
import { getChildrenRanked } from './getChildren'

/** Gets an ordered list of ShortcutIds if the user has customized their toolbar. Returns null otherwise. */
const getUserToolbar = (state: State): CommandId[] | null => {
  const userToolbarThoughtId = findDescendant(state, EM_TOKEN, ['Settings', 'Toolbar'])
  const commandIds = (userToolbarThoughtId ? getChildrenRanked(state, userToolbarThoughtId) : [])
    .map(subthought => subthought.value)
    // filter out invalid commandIds
    .filter((commandIdString): commandIdString is CommandId => !!commandById(commandIdString as CommandId))
  return commandIds.length > 0 ? commandIds : null
}

export default getUserToolbar
