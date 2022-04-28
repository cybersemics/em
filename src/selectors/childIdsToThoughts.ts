import { getThoughtById } from './index'
import { ThoughtId, State } from '../@types'

/** Converts a list of ThoughtIds to a list of Thoughts. If any one of the thoughts are not found, returns null. */
const childIdsToThoughts = (state: State, childIds: ThoughtId[]) => {
  const thoughts = childIds.map(id => getThoughtById(state, id)).filter(Boolean)
  return thoughts.length < childIds.length ? null : thoughts
}

export default childIdsToThoughts
