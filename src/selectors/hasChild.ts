import { getAllChildrenAsThoughts } from './getChildren'
import { State, ThoughtId } from '../@types'

/** Returns true if the given context has a child with the given value. O(children). */
const findDescendant = (state: State, thoughtId: ThoughtId, value: string) =>
  !!getAllChildrenAsThoughts(state, thoughtId).find(child => child.value === value)

export default findDescendant
