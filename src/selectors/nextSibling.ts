import Path from '../@types/Path'
import State from '../@types/State'
import Thought from '../@types/Thought'
import ThoughtId from '../@types/ThoughtId'
import { getChildrenSorted } from '../selectors/getChildren'
import head from '../util/head'
import getThoughtById from './getThoughtById'

/** Gets the next sibling after a thought according to its parent's sort preference. Normal view only. TODO: Add support for context view. */
const nextSibling = (state: State, idOrPath: ThoughtId | Path): Thought | null => {
  const id = typeof idOrPath === 'string' ? idOrPath : head(idOrPath)
  const thought = getThoughtById(state, id)
  if (!thought) return null
  const siblings = getChildrenSorted(state, thought.parentId)
  const i = siblings.findIndex(child => child.id === id)
  return siblings[i + 1] || null
}

export default nextSibling
