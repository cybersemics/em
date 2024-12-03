import CommandId from '../@types/CommandId'
import State from '../@types/State'
import { EM_TOKEN } from '../constants'
import { shortcutById } from '../shortcuts'
import findDescendant from './findDescendant'
import { getChildrenRanked } from './getChildren'

/** Gets an ordered list of ShortcutIds if the user has customized their toolbar. Returns null otherwise. */
const getUserToolbar = (state: State): CommandId[] | null => {
  const userToolbarThoughtId = findDescendant(state, EM_TOKEN, ['Settings', 'Toolbar'])
  const shortcutIds = (userToolbarThoughtId ? getChildrenRanked(state, userToolbarThoughtId) : [])
    .map(subthought => subthought.value)
    // filter out invalid shortcutIds
    .filter((shortcutIdString): shortcutIdString is CommandId => !!shortcutById(shortcutIdString as CommandId))
  return shortcutIds.length > 0 ? shortcutIds : null
}

export default getUserToolbar
