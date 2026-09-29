import Index from '../@types/IndexType'
import Path from '../@types/Path'
import State from '../@types/State'
import Thought from '../@types/Thought'
import ThoughtId from '../@types/ThoughtId'
import ThoughtspaceTransaction from '../@types/ThoughtspaceTransaction'
import Thunk from '../@types/Thunk'
import updateThoughts from '../actions/updateThoughts'
import { clientId } from '../data-providers/thoughtspaceSession'
import { getChildrenRanked } from '../selectors/getChildren'
import getThoughtById from '../selectors/getThoughtById'
import rootedParentOf from '../selectors/rootedParentOf'
import thoughtToPath from '../selectors/thoughtToPath'
import { registerActionMetadata } from '../util/actionMetadata.registry'
import command from '../util/command'
import equalPathHead from '../util/equalPathHead'
import hashPath from '../util/hashPath'
import headValue from '../util/headValue'
import isDescendant from '../util/isDescendant'
import reducerFlow from '../util/reducerFlow'
import timestamp from '../util/timestamp'

interface Payload {
  pathParent: Path
  thoughtId: ThoughtId
}

/** Removes a child from a thought and the corresponding Lexeme context. If it was the last instance of the Lexeme, removes it completely from the lexemeIndex. Removes the id from the parent thought event if the thought itself does not exist (See: importFiles > missingChildren). Does not update the cursor. Use deleteThoughtWithCursor or archiveThought for higher-level functions. */
const deleteThought = (state: State, { pathParent, thoughtId }: Payload, transaction?: ThoughtspaceTransaction) => {
  const deletedThought = getThoughtById(state, thoughtId) as Thought | undefined
  if (!deletedThought) return state

  const parent = getThoughtById(state, deletedThought.parentId)

  if (!parent) {
    console.error('Parent not found!', thoughtId, deletedThought?.value)
    return state
  }

  const simplePath = thoughtToPath(state, thoughtId)
  const contextViewsNew = { ...state.contextViews }
  const thoughtIndexUpdates: Index<Thought | null> = {
    // Deleted thought's parent
    [parent.id]: {
      ...parent,
      lastUpdated: timestamp(),
      updatedBy: clientId,
    } as Thought,
  }

  /** Collects explicit descendant deletes and clears their context views without copying the growing batch. */
  const collectDeletes = (id: ThoughtId, path: Path) => {
    thoughtIndexUpdates[id] = null
    delete contextViewsNew[hashPath(path)]
    getChildrenRanked(state, id).forEach(child => collectDeletes(child.id, [...path, child.id]))
  }
  collectDeletes(thoughtId, [...pathParent, thoughtId])

  const isDeletedThoughtCursor = equalPathHead(simplePath, state.cursor)

  const isCursorDescendantOfDeletedThought = !!simplePath && !!state.cursor && isDescendant(simplePath, state.cursor)

  // if the deleted thought is the cursor or a descendant of the cursor, we need to calculate a new cursor.
  const cursorNew =
    isDeletedThoughtCursor || isCursorDescendantOfDeletedThought
      ? simplePath.length > 1
        ? rootedParentOf(state, simplePath)
        : null
      : state.cursor

  return reducerFlow([
    state => ({
      ...state,
      contextViews: contextViewsNew,
      cursor: cursorNew,
      editingValue: cursorNew ? headValue(state, cursorNew) : null,
    }),
    updateThoughts({
      thoughtIndexUpdates,
    }),
  ])(state, transaction)
}

/** Action-creator for deleteThought. */
export const deleteThoughtActionCreator =
  (payload: Parameters<typeof deleteThought>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'deleteThought', ...payload })

export default command(deleteThought)

// Register this action's metadata
registerActionMetadata('deleteThought', {
  undoable: true,
})
