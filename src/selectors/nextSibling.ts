import Path from '../@types/Path'
import State from '../@types/State'
import Thought from '../@types/Thought'
import ThoughtId from '../@types/ThoughtId'
import { getChildrenSorted } from '../selectors/getChildren'
import head from '../util/head'
import isAttribute from '../util/isAttribute'
import isRoot from '../util/isRoot'
import getThoughtById from './getThoughtById'

/** Gets the next sibling after a thought according to its parent's sort preference. Normal view only. TODO: Add support for context view. */
const nextSibling = (state: State, idOrPath: ThoughtId | Path): Thought | null => {
  const id = typeof idOrPath === 'string' ? idOrPath : head(idOrPath)
  if (isRoot([id])) return null

  // return null if the thought does not exist or is hidden
  const thought = getThoughtById(state, id)
  if (!thought || (!state.showHiddenThoughts && isAttribute(thought.value))) return null

  const siblings = getChildrenSorted(state, thought.parentId)
  const index = siblings.findIndex(child => child.id === id)

  if (index === -1) {
    const message = `Thought ${thought.value} with ${
      typeof idOrPath === 'string' ? 'id' : 'Path'
    } ${idOrPath} missing from children of parent ${thought.parentId}`
    console.error(message, { thought, siblings, parent: getThoughtById(state, thought.parentId) })
    throw new Error(message)
  }

  return siblings[index + 1] || null
}

export default nextSibling
