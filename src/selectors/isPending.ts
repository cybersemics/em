import { contextToThought } from '../selectors'
import { getAllChildrenAsThoughts } from '../selectors/getChildren'
import { Context, State } from '../@types'

/** Returns true if the context has not been loaded from the remote yet, or if the children are not loaded. */
const isPending = (state: State, context: Context): boolean => {
  const thought = contextToThought(state, context)
  const children = getAllChildrenAsThoughts(state, context)
  return thought?.pending || children.length < (thought?.children.length ?? 0)
}

export default isPending
