import { State, Parent } from '../@types'

/**
 * Returns the parent thought.
 */
const getParentThought = (state: State, thoughtId: string): Parent | null => {
  const thought = state.thoughts.contextIndex[thoughtId]
  if (!thought) return null
  const parentThought = state.thoughts.contextIndex[thought.parentId]
  return parentThought
}

export default getParentThought
