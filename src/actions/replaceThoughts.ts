import _ from 'lodash'
import Path from '../@types/Path'
import State from '../@types/State'
import ThoughtIndices from '../@types/ThoughtIndices'
import Thunk from '../@types/Thunk'
import expandThoughts from '../selectors/expandThoughts'
import getThoughtById from '../selectors/getThoughtById'
import pathToThought from '../selectors/pathToThought'
import rootedParentOf from '../selectors/rootedParentOf'
import simplifyPath from '../selectors/simplifyPath'
import thoughtToPath from '../selectors/thoughtToPath'
import { registerActionMetadata } from '../util/actionMetadata.registry'
import equalPath from '../util/equalPath'
import head from '../util/head'

/** Publishes a complete canonical document without planning writes or recording undo history. */
const replaceThoughts = (
  state: State,
  { thoughts, repairCursor = false }: { thoughts: ThoughtIndices; repairCursor?: boolean },
): State => {
  const next = { ...state, thoughts, isLoading: false }
  let cursor = state.cursor
  if (repairCursor && cursor) {
    // Resolve context-view paths against the previous complete document before replacing their topology.
    const previousSimplePath = simplifyPath(state, cursor)
    const thought = getThoughtById(next, head(previousSimplePath))
    if (thought) {
      const currentSimplePath = thoughtToPath(next, thought.id)
      if (!equalPath(previousSimplePath, currentSimplePath)) cursor = currentSimplePath
    } else {
      const missingIndex = cursor.findIndex((_, i) => {
        const path = cursor!.slice(0, i + 1) as Path
        const ancestor = pathToThought(next, path)
        return !ancestor || ancestor.parentId !== head(rootedParentOf(next, path))
      })
      cursor = missingIndex > 0 ? (cursor.slice(0, missingIndex) as Path) : null
    }
  }
  const repaired = { ...next, cursor }
  return { ...repaired, expanded: expandThoughts(repaired, cursor) }
}

/** Publishes the runtime's complete document snapshot. */
export const replaceThoughtsActionCreator =
  (payload: Parameters<typeof replaceThoughts>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'replaceThoughts', ...payload })

export default _.curryRight(replaceThoughts)

registerActionMetadata('replaceThoughts', { undoable: false })
