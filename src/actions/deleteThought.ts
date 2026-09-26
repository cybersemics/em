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
  /** Whether to persist the deletion. Default: true. */
  persist?: boolean
}

interface ThoughtUpdates {
  path: Path
  thoughtIndex: Index<Thought | null>
}

/** Removes a child from a thought and the corresponding Lexeme context. If it was the last instance of the Lexeme, removes it completely from the lexemeIndex. Removes the id from the parent thought event if the thought itself does not exist (See: importFiles > missingChildren). Does not update the cursor. Use deleteThoughtWithCursor or archiveThought for higher-level functions. */
const deleteThought = (
  state: State,
  { persist = true, pathParent, thoughtId }: Payload,
  transaction?: ThoughtspaceTransaction,
) => {
  const deletedThought = getThoughtById(state, thoughtId) as Thought | undefined
  if (!deletedThought) return state

  const parent = getThoughtById(state, deletedThought.parentId)

  if (!parent) {
    console.error('Parent not found!', thoughtId, deletedThought?.value)
    return state
  }

  const simplePath = thoughtToPath(state, thoughtId)
  const path = [...pathParent, thoughtId] as Path

  // disable context view
  const contextViewsNew = { ...state.contextViews }
  delete contextViewsNew[hashPath(path)]

  /** Generates an update object that can be used to delete/update all descendants and delete/update thoughtIndex. */
  const recursiveDeletes = (thought: Thought, accumRecursive = {} as ThoughtUpdates): ThoughtUpdates => {
    const children = getChildrenRanked(state, thought.id)
    return children.reduce(
      (accum, child) => {
        delete contextViewsNew[hashPath(accum.path)]

        // RECURSION
        const recursiveResults = recursiveDeletes(child, accum)

        return {
          ...accum,
          path: [...accum.path, child.id],
          thoughtIndex: {
            ...accum.thoughtIndex,
            ...recursiveResults.thoughtIndex,
          },
        }
      },
      {
        path: pathParent,
        thoughtIndex: {
          ...accumRecursive.thoughtIndex,
          [thought.id]: null,
        },
      } as ThoughtUpdates,
    )
  }

  const descendantUpdatesResult = recursiveDeletes(deletedThought)

  const thoughtIndexUpdates: Index<Thought | null> = {
    // Deleted thought's parent
    [parent.id]: {
      ...parent,
      lastUpdated: timestamp(),
      updatedBy: clientId,
    } as Thought,
    [thoughtId]: null,
    // descendants
    ...descendantUpdatesResult.thoughtIndex,
  }

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
      persist,
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
