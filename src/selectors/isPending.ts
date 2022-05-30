import { getAllChildrenAsThoughts } from '../selectors/getChildren'
import { Thought, State } from '../@types'

/** Returns true if the context has not been loaded from the remote yet, or if the children are not loaded. */
const isPending = (state: State, thought: Thought | null): boolean => {
  if (thought?.pending) return true
  if (!thought) return false
  const children = getAllChildrenAsThoughts(state, thought.id)
  return children.length < Object.keys(thought.childrenMap).length
}

export default isPending
