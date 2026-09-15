import _ from 'lodash'
import Index from '../@types/IndexType'
import Path from '../@types/Path'
import PushBatch from '../@types/PushBatch'
import State from '../@types/State'
import Thought from '../@types/Thought'
import ThoughtId from '../@types/ThoughtId'
import Thunk from '../@types/Thunk'
import updateThoughts from '../actions/updateThoughts'
import { clientId } from '../data-providers/thoughtspaceSession'
import { getChildrenRanked } from '../selectors/getChildren'
import getThoughtById from '../selectors/getThoughtById'
import rootedParentOf from '../selectors/rootedParentOf'
import thoughtToPath from '../selectors/thoughtToPath'
import { registerActionMetadata } from '../util/actionMetadata.registry'
import appendToPath from '../util/appendToPath'
import equalPathHead from '../util/equalPathHead'
import hashPath from '../util/hashPath'
import headValue from '../util/headValue'
import isDescendant from '../util/isDescendant'
import keyValueBy from '../util/keyValueBy'
import reducerFlow from '../util/reducerFlow'
import timestamp from '../util/timestamp'

interface Payload {
  pathParent: Path
  thoughtId: ThoughtId
  /** If both local and remote are false, only deallocate thoughts from State, but do not delete them permanently. This is used by freeThoughts. The parent is marked as pending so that the thought will be automatically restored if it becomes visible again. */
  local?: boolean
  remote?: boolean
}

interface ThoughtUpdates {
  path: Path
  thoughtIndex: Index<Thought | null>
  pendingDeletes?: PushBatch['pendingDeletes']
}

/** Deletes a thought and its loaded descendants, or frees them from cache without changing stored membership. */
const deleteThought = (state: State, { local = true, pathParent, thoughtId, remote = true }: Payload) => {
  const deletedThought = getThoughtById(state, thoughtId) as Thought | undefined
  if (!deletedThought) return state

  // See: Payload.local
  const persist = local || remote
  const parent = getThoughtById(state, deletedThought.parentId)

  if (!parent) {
    console.error('Parent not found!', thoughtId, deletedThought.value)
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
        // if pending, append to a special pendingDeletes field so all descendants can be loaded and deleted asynchronously
        if (child.pending) {
          const thoughtUpdate: ThoughtUpdates = {
            ...accum,
            // do not delete the pending thought yet since the second call to deleteThought needs a starting point
            pendingDeletes: [
              ...(accumRecursive.pendingDeletes || []),
              { path: appendToPath(pathParent, thought.id, child.id), siblingIds: children.map(child => child.id) },
            ],
          }

          return thoughtUpdate
        }

        delete contextViewsNew[hashPath(accum.path)]

        // RECURSION
        const recursiveResults = recursiveDeletes(child, accum)

        return {
          ...accum,
          path: [...accum.path, child.id],
          pendingDeletes: _.uniq([
            ...(accum.pendingDeletes || []),
            ...(accumRecursive.pendingDeletes || []),
            ...(recursiveResults.pendingDeletes || []),
          ]),
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

  const thoughtIndexUpdates = {
    // Deleted thought's parent
    [parent.id]: {
      ...parent,
      ...(persist
        ? {
            childrenMap: keyValueBy(parent.childrenMap || {}, (key, id) => (id !== thoughtId ? { [key]: id } : null)),
            lastUpdated: timestamp(),
            updatedBy: clientId,
          }
        : { pending: true }),
    } as Thought,
    [thoughtId]: null,
    // descendants
    ...descendantUpdatesResult.thoughtIndex,
  }

  // Cache eviction keeps complete memberships until none of their occurrences remain loaded.
  // Persistent deletion instead derives memberships from thoughtIndexUpdates in updateThoughts.
  const lexemeIndexUpdates = persist
    ? undefined
    : Object.fromEntries(
        Object.entries(state.thoughts.lexemeIndex).flatMap(([key, lexeme]) =>
          lexeme.contexts.some(id => thoughtIndexUpdates[id] === null) &&
          !lexeme.contexts.some(id => getThoughtById(state, id) && thoughtIndexUpdates[id] !== null)
            ? [[key, null]]
            : [],
        ),
      )

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
      lexemeIndexUpdates,
      pendingDeletes: descendantUpdatesResult.pendingDeletes,
      local,
      remote,
      overwritePending: !persist,
    }),
  ])(state)
}

/** Action-creator for deleteThought. */
export const deleteThoughtActionCreator =
  (payload: Parameters<typeof deleteThought>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'deleteThought', ...payload })

export default _.curryRight(deleteThought)

// Register this action's metadata
registerActionMetadata('deleteThought', {
  undoable: true,
})
