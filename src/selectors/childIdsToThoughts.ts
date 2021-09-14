import { Child, State } from '../@types'

/**
 * For the given array of thought ids returns the parent entries.
 */
const childIdsToThoughts = (state: State, childIds: Child[]) => childIds.map(id => state.thoughts.contextIndex[id])

export default childIdsToThoughts
