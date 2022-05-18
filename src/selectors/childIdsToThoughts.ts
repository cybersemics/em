import { getThoughtById } from './index'
import { Thought, ThoughtId, State } from '../@types'

/** Converts a list of ThoughtIds to a list of Thoughts. May return a smaller list if any thoughts are missing. */
const childIdsToThoughts = (state: State, childIds: ThoughtId[]): Thought[] =>
  childIds.map(id => getThoughtById(state, id)).filter(Boolean)

export default childIdsToThoughts
