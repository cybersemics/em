import { Child, State } from '../@types'

/**
 *
 */
const childIdsToThoughts = (state: State, childIds: Child[]) => childIds.map(id => state.thoughts.contextIndex[id])

export default childIdsToThoughts
