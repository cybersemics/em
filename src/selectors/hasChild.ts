import { getAllChildrenAsThoughtsById } from './getChildren'
import { State, ThoughtId } from '../@types'

/** Returns true if the given context has a child with the given value. O(children). */
const hasChild = (state: State, thoughtId: ThoughtId, value: string) =>
  !!getAllChildrenAsThoughtsById(state, thoughtId).find(child => child.value === value)

export default hasChild
