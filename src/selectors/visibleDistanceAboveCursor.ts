import State from '../@types/State'
import { HOME_TOKEN, MAX_DISTANCE_FROM_CURSOR } from '../constants'
import { hasChildren } from '../selectors/getChildren'
import head from '../util/head'

/**
 * Distance between the first visible thought nearest to the root and the cursor.
 */
const visibleDistanceAboveCursor = (state: State) =>
  MAX_DISTANCE_FROM_CURSOR - (hasChildren(state, state.cursor ? head(state.cursor) : HOME_TOKEN) ? 2 : 1)

export default visibleDistanceAboveCursor
