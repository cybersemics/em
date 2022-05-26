import { HOME_TOKEN, MAX_DISTANCE_FROM_CURSOR } from '../constants'
import { head } from '../util'
import { getChildren } from '../selectors'
import { State } from '../@types'

/**
 * Distance between the first visible thought nearest to the root and the cursor.
 */
const visibleDistanceAboveCursor = (state: State) =>
  MAX_DISTANCE_FROM_CURSOR - (getChildren(state, state.cursor ? head(state.cursor) : HOME_TOKEN).length === 0 ? 1 : 2)

export default visibleDistanceAboveCursor
