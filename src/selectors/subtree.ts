import { getChildrenRankedById } from '../selectors'
import { Thought, ThoughtId, State } from '../@types'

/** Gets a nested subtree of all of the given context's descendants. */
const subtree = (state: State, id: ThoughtId): Thought[] =>
  getChildrenRankedById(state, id).map(child => ({
    ...child,
    subthoughts: subtree(state, child.id),
  }))

export default subtree
