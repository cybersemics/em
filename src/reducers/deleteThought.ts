import _ from 'lodash'
import Index from '../@types/IndexType'
import Lexeme from '../@types/Lexeme'
import Path from '../@types/Path'
import PushBatch from '../@types/PushBatch'
import State from '../@types/State'
import Thought from '../@types/Thought'
import ThoughtId from '../@types/ThoughtId'
import alert from '../reducers/alert'
import updateThoughts from '../reducers/updateThoughts'
import { getChildrenRanked } from '../selectors/getChildren'
import getDescendantThoughtIds from '../selectors/getDescendantThoughtIds'
import { getLexeme } from '../selectors/getLexeme'
// import { treeDelete } from '../util/recentlyEditedTree'
import getThoughtById from '../selectors/getThoughtById'
import hasLexeme from '../selectors/hasLexeme'
import rootedParentOf from '../selectors/rootedParentOf'
import thoughtToPath from '../selectors/thoughtToPath'
import equalArrays from '../util/equalArrays'
import hashThought from '../util/hashThought'
import isDescendant from '../util/isDescendant'
import keyValueBy from '../util/keyValueBy'
import reducerFlow from '../util/reducerFlow'
import removeContext from '../util/removeContext'
import { getSessionId } from '../util/sessionManager'
import timestamp from '../util/timestamp'

interface Payload {
  pathParent: Path
  thoughtId: ThoughtId
  orphaned?: boolean
  showContexts?: boolean
}

interface ThoughtUpdates {
  thoughtIndex: Index<Thought | null>
  lexemeIndex: Index<Lexeme | null>
  pendingDeletes?: PushBatch['pendingDeletes']
}

/** Returns a list of all pending descendants of the given thoughts (inclusive). */
const filterPendingDescendants = (state: State, thoughtIds: ThoughtId[]): ThoughtId[] =>
  _.flatMap(thoughtIds, thoughtId => {
    const thought = getThoughtById(state, thoughtId)

    const isThoughtPending = !thought || thought.pending

    return isThoughtPending
      ? // return pending input thoughts as-is
        // there are no non-pending descendants to traverse
        [thoughtId]
      : // otherwise traverse descendants for pending thoughts
        getDescendantThoughtIds(state, thoughtId).filter(descendantThoughtId => {
          const descendantThought = getThoughtById(state, descendantThoughtId)
          return !descendantThought || descendantThought.pending
        })
  })

/** Removes a thought from a context. If it was the last thought in that context, removes it completely from the lexemeIndex. Does not update the cursor. Use deleteThoughtWithCursor or archiveThought for high-level functions.
 */
const deleteThought = (state: State, { pathParent, thoughtId }: Payload) => {
  const deletedThought = getThoughtById(state, thoughtId)
  const path = thoughtToPath(state, deletedThought.id)

  if (!deletedThought) {
    console.error(`deleteThought: Thought not found for id ${thoughtId}`)
    return state
  }

  // All pending descendants must be pulled before deleteThought can be executed.
  // 2-part deletes can leave the state in an invalid intermediate state that is vulnerable to concurrency issues.
  const pending = filterPendingDescendants(state, [deletedThought.id])
  if (pending.length > 0) {
    return reducerFlow([
      updateThoughts({
        // include a NOOP thought update, otherwise updateThoughts will short circuit
        // TODO: Don't short circuit if there are pendingDeletes
        thoughtIndexUpdates: {
          [deletedThought.id]: deletedThought,
        },
        lexemeIndexUpdates: {},
        pendingDeletes: [path],
      }),
      alert({ value: 'Loading subthoughts for deletion...' }),
    ])(state)
  }

  const { value } = deletedThought

  // guard against missing lexeme
  // while this should never happen, there are some concurrency issues that can cause it to happen, so we should print an error and just delete the Parent
  if (!hasLexeme(state, value)) {
    console.warn(`Lexeme not found for thought value: ${value}. Deleting thought anyway.`)
  }

  const key = hashThought(value)
  const lexeme = getLexeme(state, value)

  const parent = getThoughtById(state, deletedThought.parentId)

  // Note: When a thought is deleted and there are pending deletes, then on flushing the deletes, the parent won't be available in the tree. So for orphaned thoughts deletion we use special orphaned param
  if (!parent) {
    console.error('Parent not found!')
    return state
  }

  const lexemeIndexNew = { ...state.thoughts.lexemeIndex }

  // TODO: Re-enable Recently Edited
  // Uncaught TypeError: Cannot perform 'IsArray' on a proxy that has been revoked at Function.isArray (#417)
  // let recentlyEdited = state.recentlyEdited // eslint-disable-line fp/no-let
  // try {
  //   recentlyEdited = treeDelete(state, state.recentlyEdited, path)
  // } catch (e) {
  //   console.error('deleteThought: treeDelete immer error')
  //   console.error(e)
  // }

  // the old Lexeme less the context
  const lexemeNew =
    lexeme?.contexts && lexeme.contexts.length > 1 ? removeContext(state, lexeme, deletedThought.id) : null

  // update state so that we do not have to wait for firebase
  if (lexemeNew) {
    lexemeIndexNew[key] = lexemeNew
  } else {
    delete lexemeIndexNew[key] // eslint-disable-line fp/no-delete
  }

  // remove thought from contextViews
  const contextViewsNew = { ...state.contextViews }
  if (parent) delete contextViewsNew[parent.id] // eslint-disable-line fp/no-delete

  const childrenMap = keyValueBy(parent?.childrenMap || {}, (key, id) =>
    id !== deletedThought.id ? { [key]: id } : null,
  )

  /** Generates a firebase update object that can be used to delete/update all descendants and delete/update thoughtIndex. */
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
        const lexemeChildNew =
          lexemeChild?.contexts && lexemeChild.contexts.length > 1
            ? // update child with deleted context removed
              removeContext(state, lexemeChild, child.id)
            : // if this was the only context of the child, delete the child
              null

        // update local lexemeIndex so that we do not have to wait for firebase
        if (lexemeChildNew) {
          lexemeIndexNew[hashedKey] = lexemeChildNew
        } else {
          delete lexemeIndexNew[hashedKey] // eslint-disable-line fp/no-delete
        }

        if (child.pending) {
          throw new Error(
            'All pending descendants must be pulled before deleteThought can be executed. 2-part deletes can leave the state in an invalid intermediate state that is vulnerable to concurrency issues.',
          )
        }

        // RECURSION
        const recursiveResults = recursiveDeletes(child, accum)

        return {
          ...accum,
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
        lexemeIndex: accumRecursive.lexemeIndex,
        thoughtIndex: {
          ...accumRecursive.thoughtIndex,
          [thought.id]: null,
        },
      } as ThoughtUpdates,
    )
  }

  // do not delete descendants when the thought has a duplicate sibling
  const descendantUpdatesResult = recursiveDeletes(deletedThought)

  const lexemeIndexUpdates = {
    [key]: lexemeNew,
    ...descendantUpdatesResult.lexemeIndex,
  }

  const thoughtIndexUpdates = {
    // Deleted thought's parent
    // Note: Thoughts in pending deletes won't have their parent in the state. So orphaned thoughts doesn't need to care about its parent update.
    ...(parent && {
      [parent.id]: {
        ...parent,
        childrenMap,
        lastUpdated: timestamp(),
        updatedBy: getSessionId(),
      } as Thought,
    }),
    [deletedThought.id]: null,
    // descendants
    ...descendantUpdatesResult.thoughtIndex,
  }

  const isDeletedThoughtCursor = !!path && !!state.cursor && equalArrays(state.cursor, path)

  const isCursorDescendantOfDeletedThought = !!path && !!state.cursor && isDescendant(path, state.cursor)

  // if the deleted thought is the cursor or a descendant of the cursor, we need to calculate a new cursor.
  const cursorNew =
    isDeletedThoughtCursor || isCursorDescendantOfDeletedThought ? rootedParentOf(state, path!) : state.cursor

  return reducerFlow([
    state => ({
      ...state,
      contextViews: contextViewsNew,
      cursor: cursorNew,
    }),
    updateThoughts({
      thoughtIndexUpdates,
      lexemeIndexUpdates,
      // recentlyEdited,
    }),
  ])(state)
}

export default _.curryRight(deleteThought)
