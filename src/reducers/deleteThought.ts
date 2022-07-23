import _ from 'lodash'
import Index from '../@types/IndexType'
import Lexeme from '../@types/Lexeme'
import Path from '../@types/Path'
import PushBatch from '../@types/PushBatch'
import State from '../@types/State'
import Thought from '../@types/Thought'
import ThoughtId from '../@types/ThoughtId'
import updateThoughts from '../reducers/updateThoughts'
import { getChildrenRanked } from '../selectors/getChildren'
import { getLexeme } from '../selectors/getLexeme'
import getThoughtById from '../selectors/getThoughtById'
import hasLexeme from '../selectors/hasLexeme'
import rootedParentOf from '../selectors/rootedParentOf'
import thoughtToPath from '../selectors/thoughtToPath'
import appendToPath from '../util/appendToPath'
import hashThought from '../util/hashThought'
import head from '../util/head'
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
}

interface ThoughtUpdates {
  thoughtIndex: Index<Thought | null>
  lexemeIndex: Index<Lexeme | null>
  pendingDeletes?: PushBatch['pendingDeletes']
}

// @MIGRATION_TODO: Maybe deleteThought doesn't need to know about the orhapned logic directlty. Find a better way to handle this.
/** Removes a thought from a context. If it was the last thought in that context, removes it completely from the lexemeIndex. Does not update the cursor. Use deleteThoughtWithCursor or archiveThought for high-level functions.
 *
 * @param orphaned - In pending deletes situation, the parent is already deleted, so at such case parent doesn't need to be updated.
 */
const deleteThought = (state: State, { pathParent, thoughtId, orphaned }: Payload) => {
  const deletedThought = getThoughtById(state, thoughtId)

  if (!deletedThought) {
    console.error(`deleteThought: Thought not found for id ${thoughtId}`)
    return state
  }

  const { value } = deletedThought

  // guard against missing lexeme
  // while this should never happen, there are some concurrency issues that can cause it to happen, so we should print an error and just delete the Parent
  if (!hasLexeme(state, value)) {
    console.warn(`Lexeme not found for thought value: ${value}. Deleting thought anyway.`)
  }

  const key = hashThought(value)
  const lexeme = getLexeme(state, value)

  const parent = orphaned ? null : getThoughtById(state, deletedThought.parentId)

  // Note: When a thought is deleted and there are pending deletes, then on flushing the deletes, the parent won't be available in the tree. So for orphaned thoughts deletion we use special orphaned param
  if (!orphaned && !parent) {
    console.error('Parent not found!')
    return state
  }

  const lexemeIndexNew = { ...state.thoughts.lexemeIndex }
  const path = thoughtToPath(state, deletedThought.id)

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

        // RECURSION
        const recursiveResults = recursiveDeletes(child, accum)

        return {
          ...accum,
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

  const isDeletedThoughtCursor = !!path && !!state.cursor && head(path) === head(state.cursor)

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
      pendingDeletes: descendantUpdatesResult.pendingDeletes,
    }),
  ])(state)
}

export default _.curryRight(deleteThought)
