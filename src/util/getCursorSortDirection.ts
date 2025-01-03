import State from '../@types/State'
import ThoughtId from '../@types/ThoughtId'
import { HOME_TOKEN } from '../constants'
import getSortPreference from '../selectors/getSortPreference'

/** Retrieves the parent ID from the state's cursor. */
const getParentIdFromCursor = (state: State): ThoughtId | null => {
  const cursor = state.cursor

  if (!cursor || cursor.length < 2) {
    // No cursor or cursor has less than 2 items (no parent)
    return HOME_TOKEN
  }

  // Return the parent ID, which is the second last item in the cursor
  return cursor[cursor.length - 2]
}

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
