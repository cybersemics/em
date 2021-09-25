import _ from 'lodash'
import { updateThoughts } from '../reducers'
import { treeDelete } from '../util/recentlyEditedTree'
import {
  getAllChildren,
  getChildrenRanked,
  getLexeme,
  isPending,
  rankThoughtsFirstMatch,
  rootedParentOf,
} from '../selectors'
import { Child, Context, Index, Lexeme, Parent, State } from '../@types'
import { getSessionId } from '../util/sessionManager'
import { equalThoughtRanked, hashContext, hashThought, reducerFlow, removeContext, timestamp, unroot } from '../util'

interface Payload {
  context: Context
  thoughtRanked: Child
  showContexts?: boolean
}

interface ThoughtUpdates {
  contextIndex: Index<Parent | null>
  thoughtIndex: Index<Lexeme | null>
  pendingDeletes?: { context: Context; child: Child }[]
}

/** Removes a thought from a context. If it was the last thought in that context, removes it completely from the thoughtIndex. Does not update the cursor. Use deleteThoughtWithCursor or archiveThought for high-level functions. */
const deleteThought = (state: State, { context, thoughtRanked, showContexts }: Payload) => {
  const { value, rank } = thoughtRanked

  const thoughts = unroot(context.concat(value))
  context = rootedParentOf(state, thoughts)
  const key = hashThought(value)
  const lexeme = getLexeme(state, value)

  // guard against missing lexeme
  // while this should never happen, there are some concurrency issues that can cause it to happen, so we should print an error and just delete the Parent
  if (!lexeme) {
    console.warn(
      `Missing Lexeme: "${value}". This indicates that there is a data integrity issue upstream. Deleting Parent anyway.`,
    )
  }

  const contextEncoded = hashContext(context)
  const thoughtIndexNew = { ...state.thoughts.thoughtIndex }
  const oldRankedThoughts = rankThoughtsFirstMatch(state, thoughts as string[])

  // Uncaught TypeError: Cannot perform 'IsArray' on a proxy that has been revoked at Function.isArray (#417)
  let recentlyEdited = state.recentlyEdited // eslint-disable-line fp/no-let
  try {
    recentlyEdited = treeDelete(state.recentlyEdited, oldRankedThoughts)
  } catch (e) {
    console.error('deleteThought: treeDelete immer error')
    console.error(e)
  }

  // the old thought less the context
  const newOldLexeme =
    lexeme?.contexts && lexeme.contexts.length > 1 ? removeContext(lexeme, context, showContexts ? 0 : rank) : null

  // update state so that we do not have to wait for firebase
  if (newOldLexeme) {
    thoughtIndexNew[key] = newOldLexeme
  } else {
    delete thoughtIndexNew[key] // eslint-disable-line fp/no-delete
  }

  // remove thought from contextViews
  const contextViewsNew = { ...state.contextViews }
  delete contextViewsNew[contextEncoded] // eslint-disable-line fp/no-delete

  const subthoughts = getAllChildren(state, context).filter(child => !equalThoughtRanked(child, { value, rank }))

  /** Generates a firebase update object that can be used to delete/update all descendants and delete/update contextIndex. */
  const recursiveDeletes = (thoughts: Context, accumRecursive = {} as ThoughtUpdates): ThoughtUpdates => {
    // modify the state to use the thoughtIndex with newOldLexeme
    // this ensures that contexts are calculated correctly for descendants with duplicate values
    const stateNew: State = {
      ...state,
      thoughts: {
        ...state.thoughts,
        thoughtIndex: thoughtIndexNew,
      },
    }

    return getChildrenRanked(stateNew, thoughts).reduce(
      (accum, child) => {
        const hashedKey = hashThought(child.value)
        const childThought = getLexeme(stateNew, child.value)
        const childNew =
          childThought && childThought.contexts && childThought.contexts.length > 1
            ? // update child with deleted context removed
              removeContext(childThought, thoughts, child.rank)
            : // if this was the only context of the child, delete the child
              null

        // update local thoughtIndex so that we do not have to wait for firebase
        if (childNew) {
          thoughtIndexNew[hashedKey] = childNew
        } else {
          delete thoughtIndexNew[hashedKey] // eslint-disable-line fp/no-delete
        }

        const thoughtIndexMerged = {
          ...accumRecursive.thoughtIndex,
          ...accum.thoughtIndex,
          [hashedKey]: childNew,
        }

        const contextIndexMerged = {
          ...accumRecursive.contextIndex,
          ...accum.contextIndex,
        }

        const childContext = [...thoughts, child.value]

        // if pending, append to a special pendingDeletes field so all descendants can be loaded and deleted asynchronously
        if (isPending(stateNew, childContext)) {
          return {
            ...accum,
            ...accumRecursive,
            // do not delete the pending thought yet since the second call to deleteThought needs a starting point
            pendingDeletes: [
              ...(accumRecursive.pendingDeletes || []),
              {
                context: thoughts,
                child,
              },
            ],
          }
        }

        // RECURSION
        const recursiveResults = recursiveDeletes(childContext, {
          ...accum,
          ...accumRecursive,
          contextIndex: contextIndexMerged,
          thoughtIndex: thoughtIndexMerged,
        })

        return {
          ...accum,
          ...accumRecursive,
          pendingDeletes: [
            ...(accum.pendingDeletes || []),
            ...(accumRecursive.pendingDeletes || []),
            ...(recursiveResults.pendingDeletes || []),
          ],
          thoughtIndex: {
            ...thoughtIndexMerged,
            ...recursiveResults.thoughtIndex,
          },
          contextIndex: {
            ...contextIndexMerged,
            ...recursiveResults.contextIndex,
          },
        }
      },
      {
        thoughtIndex: {},
        contextIndex: {
          [hashContext(thoughts)]: null,
        },
      } as ThoughtUpdates,
    )
  }

  // do not delete descendants when the thought has a duplicate sibling
  const hasDuplicateSiblings = subthoughts.some(child => hashThought(child.value || '') === key)
  const descendantUpdatesResult = !hasDuplicateSiblings
    ? recursiveDeletes(thoughts)
    : ({
        thoughtIndex: {},
        contextIndex: {},
      } as ThoughtUpdates)

  const thoughtIndexUpdates = {
    [key]: newOldLexeme,
    ...descendantUpdatesResult.thoughtIndex,
    // emptyContextDelete
  }

  const contextIndexUpdates = {
    // current thought's Parent
    [contextEncoded]:
      subthoughts.length > 0
        ? ({
            id: contextEncoded,
            context,
            children: subthoughts,
            lastUpdated: timestamp(),
            updatedBy: getSessionId(),
          } as Parent)
        : null,
    // descendants
    ...descendantUpdatesResult.contextIndex,
  }

  return reducerFlow([
    state => ({
      ...state,
      contextViews: contextViewsNew,
    }),
    updateThoughts({
      contextIndexUpdates,
      thoughtIndexUpdates,
      recentlyEdited,
      pendingDeletes: descendantUpdatesResult.pendingDeletes,
    }),
  ])(state)
}

export default _.curryRight(deleteThought)
