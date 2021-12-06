import { getThoughtById } from './index'
import { ThoughtId, State } from '../@types'

/**
 * For the given array of thought ids returns the parent entries.
 */
const childIdsToThoughts = (state: State, childIds: ThoughtId[]) => {
  const thoughts = childIds.map(id => getThoughtById(state, id)).filter(Boolean)
  // If any one of the thoughts are not found return null
  return thoughts.length < childIds.length ? null : thoughts
}

export default childIdsToThoughts
