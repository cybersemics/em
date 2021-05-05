/** A selector that returns the sort direction of the cursor context. */
import { State } from '../util/initialState'
import { getSortPreference, simplifyPath } from './index'
import { HOME_PATH } from '../constants'
import { pathToContext } from '../util'

/** Get sort direction of cursor. */
const getCursorSortDirection = (state: State) => {
  const { cursor } = state
  const simplePath = simplifyPath(state, cursor || HOME_PATH)
  const context = pathToContext(simplePath)
  return getSortPreference(state, context).direction
}

export default getCursorSortDirection
