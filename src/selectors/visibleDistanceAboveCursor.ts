import State from '../@types/State'
import { HOME_TOKEN, MAX_DISTANCE_FROM_CURSOR } from '../constants'
import { getChildren } from '../selectors/getChildren'
import head from '../util/head'

/**
 * Distance between the first visible thought nearest to the root and the cursor.
 */
const visibleDistanceAboveCursor = (state: State) =>
  MAX_DISTANCE_FROM_CURSOR - (getChildren(state, state.cursor ? head(state.cursor) : HOME_TOKEN).length === 0 ? 1 : 2)

export default visibleDistanceAboveCursor
