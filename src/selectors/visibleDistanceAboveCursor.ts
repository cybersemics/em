import { MAX_DISTANCE_FROM_CURSOR } from '../constants'
import { pathToContext } from '../util'
import { State } from '../util/initialState'
import { getChildren } from './getChildren'

/**
 * Distance between the first visible thought nearest to the root and the cursor.
 */
const visibleDistanceAboveCursor = (state: State) =>
  MAX_DISTANCE_FROM_CURSOR - (getChildren(state, pathToContext(state.cursor || [])).length === 0 ? 1 : 2)

export default visibleDistanceAboveCursor
