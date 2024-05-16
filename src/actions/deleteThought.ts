import _ from 'lodash'
import Index from '../@types/IndexType'
import Lexeme from '../@types/Lexeme'
import Path from '../@types/Path'
import PushBatch from '../@types/PushBatch'
import State from '../@types/State'
import Thought from '../@types/Thought'
import ThoughtId from '../@types/ThoughtId'
import Thunk from '../@types/Thunk'
import updateThoughts from '../actions/updateThoughts'
import { HOME_PATH } from '../constants'
import { clientId } from '../data-providers/yjs'
import { getChildrenRanked } from '../selectors/getChildren'
import { getLexeme } from '../selectors/getLexeme'
import getThoughtById from '../selectors/getThoughtById'
import hasLexeme from '../selectors/hasLexeme'
import rootedParentOf from '../selectors/rootedParentOf'
import thoughtToPath from '../selectors/thoughtToPath'
import appendToPath from '../util/appendToPath'
import equalPathHead from '../util/equalPathHead'
import hashPath from '../util/hashPath'
import hashThought from '../util/hashThought'
import head from '../util/head'
import headValue from '../util/headValue'
import isDescendant from '../util/isDescendant'
import keyValueBy from '../util/keyValueBy'
import reducerFlow from '../util/reducerFlow'
import removeContext from '../util/removeContext'
import timestamp from '../util/timestamp'

interface Payload {
  pathParent: Path
  thoughtId: ThoughtId
  /** In pending deletes situation, the parent is already deleted, so at such case parent doesn't need to be updated. */
  orphaned?: boolean
  /** If both local and remote are false, only deallocate thoughts from State, but do not delete them permanently. This is used by freeThoughts. The parent is marked as pending so that the thought will be automatically restored if it becomes visible again. */
  local?: boolean
  remote?: boolean
}

interface ThoughtUpdates {
  path: Path
  thoughtIndex: Index<Thought | null>
  lexemeIndex: Index<Lexeme | null>
  pendingDeletes?: PushBatch['pendingDeletes']
}

/** Removes a child from a thought and the corresponding Lexeme context. If it was the last instance of the Lexeme, removes it completely from the lexemeIndex. Removes the id from the parent thought event if the thought itself does not exist (See: importFiles > missingChildren). Does not update the cursor. Use deleteThoughtWithCursor or archiveThought for higher-level functions. */
// @MIGRATION_TODO: Maybe deleteThought doesn't need to know about the orhapned logic directly. Find a better way to handle this.
const deleteThought = (state: State, { local = true, pathParent, thoughtId, orphaned, remote = true }: Payload) => {
  const deletedThought = getThoughtById(state, thoughtId) as Thought | undefined
  const value = deletedThought?.value

  // See: Payload.local
  const persist = local || remote

  // guard against missing lexeme
  // while this ideally shouldn't happen, there are some concurrency issues that can cause it to happen, as well as freeThoughts, so we should print an error and just delete the Parent
  if (deletedThought && !hasLexeme(state, value!)) {
    console.warn(`Lexeme not found for thought value: ${value}. Deleting thought anyway.`)
  }

  const key = deletedThought ? hashThought(value!) : null
  const lexeme = deletedThought ? getLexeme(state, value!) : null

  const parent = orphaned ? null : getThoughtById(state, deletedThought ? deletedThought.parentId : head(pathParent))

  // Note: When a thought is deleted and there are pending deletes, then on flushing the deletes, the parent won't be available in the tree. So for orphaned thoughts deletion we use special orphaned param
  if (!orphaned && !parent) {
    console.error('Parent not found!', thoughtId, deletedThought?.value)
    return state
  }

  const lexemeIndexNew = { ...state.thoughts.lexemeIndex }
  const simplePath = thoughtToPath(state, thoughtId)
  const path = [...pathParent, thoughtId] as Path

  // TODO: Re-enable Recently Edited
  // Uncaught TypeError: Cannot perform 'IsArray' on a proxy that has been revoked at Function.isArray (#417)
  // let recentlyEdited = state.recentlyEdited
  // try {
  //   recentlyEdited = treeDelete(state, state.recentlyEdited, path)
  // } catch (e) {
  //   console.error('deleteThought: treeDelete immer error')
  //   console.error(e)
  // }

  // The new Lexeme is typically the old Lexeme less the deleted context.
  // However, during deallocation we should not remove a single context, which would create an invalid Lexeme. Instead, we keep the Lexeme intact with all contexts, only deallocating it when all of its context thoughts have been deallocated.
  const lexemeWithoutContext = lexeme ? removeContext(state, lexeme, thoughtId) : null

  const lexemeNew = persist
    ? lexemeWithoutContext?.contexts.length
      ? lexemeWithoutContext
      : null
    : (lexemeWithoutContext?.contexts || []).some(cxid => getThoughtById(state, cxid))
      ? // ! lexeme must be defined because lexemeWithoutContext exists
        lexeme!
      : null

  // update state so that we do not have to wait for the remote
  if (key) {
    if (lexemeNew) {
      lexemeIndexNew[key] = lexemeNew
    } else {
      delete lexemeIndexNew[key]
    }
  }

  // disable context view
  const contextViewsNew = { ...state.contextViews }
  delete contextViewsNew[hashPath(path)]

  /** Generates an update object that can be used to delete/update all descendants and delete/update thoughtIndex. */
  const recursiveDeletes = (thought: Thought, accumRecursive = {} as ThoughtUpdates): ThoughtUpdates => {
    // modify the state to use the lexemeIndex with lexemeNew
    // this ensures that contexts are calculated correctly for descendants with duplicate values
    const stateNew: State = {
      ...state,
      thoughts: {
        ...state.thoughts,
        lexemeIndex: lexemeIndexNew,
      },
    }

    const children = getChildrenRanked(stateNew, thought.id)
    return children.reduce(
      (accum, child) => {
        const hashedKey = hashThought(child.value)
        const lexemeChild = getLexeme(stateNew, child.value)

        // The new Lexeme is typically the old Lexeme less the deleted context.
        // However, during deallocation we should not remove a single context, which would create an invalid context superscript. Instead, we keep the Lexeme intact with all contexts, only deallocating it when all of its context thoughts have been deallocated.
        const lexemeChildWithoutContext = lexemeChild ? removeContext(state, lexemeChild, child.id) : null
        const lexemeChildNew = persist
          ? lexemeChildWithoutContext?.contexts.length
            ? lexemeChildWithoutContext
            : null
          : lexemeChildWithoutContext?.contexts.some(cxid => getThoughtById(state, cxid))
            ? // !: lexemeChild must be defined because lexemeChildWithoutContext exists
              lexemeChild!
            : null

        // update local lexemeIndex so that we do not have to wait for the remote
        if (lexemeChildNew) {
          lexemeIndexNew[hashedKey] = lexemeChildNew
        } else {
          delete lexemeIndexNew[hashedKey]
        }

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
          lexemeIndex: {
            ...accum.lexemeIndex,
            ...recursiveResults.lexemeIndex,
            [hashedKey]: lexemeChildNew,
          },
          thoughtIndex: {
            ...accum.thoughtIndex,
            ...recursiveResults.thoughtIndex,
          },
        }
      },
      {
        path: pathParent,
        lexemeIndex: accumRecursive.lexemeIndex,
        thoughtIndex: {
          ...accumRecursive.thoughtIndex,
          [thought.id]: null,
        },
      } as ThoughtUpdates,
    )
  }

  // do not delete descendants when the thought has a duplicate sibling
  const descendantUpdatesResult: ThoughtUpdates = deletedThought
    ? recursiveDeletes(deletedThought)
    : { lexemeIndex: {}, thoughtIndex: {}, path: HOME_PATH }

  const lexemeIndexUpdates: ThoughtUpdates['lexemeIndex'] = key
    ? {
        ...(lexemeNew !== lexeme ? { [key]: lexemeNew } : null),
        ...descendantUpdatesResult.lexemeIndex,
      }
    : {}

  const thoughtIndexUpdates = {
    // Deleted thought's parent
    // Note: Thoughts in pending deletes won't have their parent in the state. So orphaned thoughts doesn't need to care about its parent update.
    ...(parent && {
      [parent.id]: {
        ...parent,
        ...(persist
          ? {
              childrenMap: keyValueBy(parent?.childrenMap || {}, (key, id) =>
                id !== thoughtId ? { [key]: id } : null,
              ),
              lastUpdated: timestamp(),
              updatedBy: clientId,
            }
          : { pending: true }),
      } as Thought,
    }),
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
      lexemeIndexUpdates,
      // recentlyEdited,
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
