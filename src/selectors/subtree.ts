import State from '../@types/State'
import Thought from '../@types/Thought'
import ThoughtId from '../@types/ThoughtId'
import { getChildrenRanked } from '../selectors/getChildren'

/** Gets a nested subtree of all of the given context's descendants. */
const subtree = (state: State, id: ThoughtId): Thought[] =>
  getChildrenRanked(state, id).map(child => ({
    ...child,
    subthoughts: subtree(state, child.id),
  }))

export default subtree
