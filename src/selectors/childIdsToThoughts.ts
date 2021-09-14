import { getThoughtById } from '.'
import { Child, State } from '../@types'

/**
 * For the given array of thought ids returns the parent entries.
 */
const childIdsToThoughts = (state: State, childIds: Child[]) => childIds.map(id => getThoughtById(state, id))

export default childIdsToThoughts
