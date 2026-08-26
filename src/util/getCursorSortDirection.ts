import State from '../@types/State'
import ThoughtId from '../@types/ThoughtId'
import getSortPreference from '../selectors/getSortPreference'
import parentContextPath from '../selectors/parentContextPath'
import rootedParentOf from '../selectors/rootedParentOf'
import head from './head'

/** Retrieves the id of the parent of the thought displayed at the cursor. In the context view this is the parent of the context, e.g. the parent of b for the cursor a/m~/b — not the context view thought m. */
const getParentIdFromCursor = (state: State): ThoughtId | null =>
  state.cursor ? head(rootedParentOf(state, parentContextPath(state, state.cursor))) : null

/** Cursor Sort Direction. */
const getCursorSortDirection = (state: State) => {
  const parentId = getParentIdFromCursor(state)

  if (!parentId) {
    // If there's no parent, perhaps return null or default sort preference
    return null
  }

  // Get the sort preference using the parentId
  const sortPref = getSortPreference(state, parentId)
  if (sortPref.type === 'None') {
    return null
  }

  return sortPref.direction || null
}

export default getCursorSortDirection
