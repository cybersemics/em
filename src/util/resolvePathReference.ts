import Path from '../@types/Path'
import State from '../@types/State'
import ThoughtId from '../@types/ThoughtId'
import attribute from '../selectors/attribute'
import findDescendant from '../selectors/findDescendant'
import { findAnyChild } from '../selectors/getChildren'

/**
 * Returns path reference information for a thought if it has a =note/=path attribute.
 * If the target thought doesn't exist yet but the pathValue is valid, still returns information.
 */
export const resolvePathReference = (state: State, thoughtId: ThoughtId, noteId?: ThoughtId) => {
  // Find the =note attribute if not provided
  const _noteId = noteId || findDescendant(state, thoughtId, '=note')
  if (!_noteId) return null

  // Get the path value directly using the attribute selector
  const pathValue = attribute(state, _noteId, '=path')
  if (!pathValue) return null

  // Find the target thought
  const targetThought = findAnyChild(state, thoughtId, child => child.value === pathValue)

  return {
    pathValue,
    targetId: targetThought?.id,
    targetExists: !!targetThought,
    targetPath: targetThought ? ([thoughtId, targetThought.id] as Path) : null,
  }
}

export default resolvePathReference
