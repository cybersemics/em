import _ from 'lodash'
import { updateThoughts } from '../reducers'
import { treeDelete } from '../util/recentlyEditedTree'
import {
  getChildrenRanked,
  getLexeme,
  getParent,
  hasLexeme,
  isPending,
  rankThoughtsFirstMatch,
  rootedParentOf,
} from '../selectors'
import { Child, Context, Index, Lexeme, Parent, State } from '../@types'

// util
import { hashThought, reducerFlow, removeContext, timestamp, unroot } from '../util'
import { getAllChildrenAsThoughts } from '../selectors/getChildren'

interface Payload {
  context: Context
  thoughtId: Child
  showContexts?: boolean
}

interface ThoughtUpdates {
  contextIndex: Index<Parent | null>
  thoughtIndex: Index<Lexeme | null>
  pendingDeletes?: { context: Context; child: Child }[]
}

/** Removes a thought from a context. If it was the last thought in that context, removes it completely from the thoughtIndex. Does not update the cursor. Use deleteThoughtWithCursor or archiveThought for high-level functions. */
const deleteThought = (state: State, { context, thoughtId, showContexts }: Payload) => {
  const thought = state.thoughts.contextIndex[thoughtId]

  const { value, rank } = thought
  if (!hasLexeme(state, value)) return state

  const thoughts = unroot(context.concat(value))
  context = rootedParentOf(state, thoughts)
  const key = hashThought(value)
  const lexeme = getLexeme(state, value)
  const parent = getParent(state, context)
  const deletedThought = getParent(state, thoughts)

  if (!deletedThought) {
    console.error('Parent entry of deleted thought not found!')
    return state
  }

  if (!parent) {
    console.error('Parent not found!')
    return state
  }

  // guard against missing lexeme (although this should never happen)
  if (!lexeme) {
    console.error('Lexeme not found', value)
    return state
  }

  const thoughtIndexNew = { ...state.thoughts.thoughtIndex }
  const oldRankedThoughts = rankThoughtsFirstMatch(state, thoughts as string[])

  const isValidThought = lexeme.contexts.find(thoughtId => thoughtId === deletedThought.id)

  // if thought is not valid then just stop further execution
  if (!isValidThought) {
    console.error(`Thought ${value} with rank ${rank} is not in ${JSON.stringify(context)}`)
    return state
  }

  // Uncaught TypeError: Cannot perform 'IsArray' on a proxy that has been revoked at Function.isArray (#417)
  let recentlyEdited = state.recentlyEdited // eslint-disable-line fp/no-let
  try {
    recentlyEdited = treeDelete(state, state.recentlyEdited, oldRankedThoughts)
  } catch (e) {
    console.error('deleteThought: treeDelete immer error')
    console.error(e)
  }

  // the old thought less the context
  const newOldThought =
    lexeme.contexts && lexeme.contexts.length > 1 ? removeContext(state, lexeme, context, rank) : null

  // update state so that we do not have to wait for firebase
  if (newOldThought) {
    thoughtIndexNew[key] = newOldThought
  } else {
    delete thoughtIndexNew[key] // eslint-disable-line fp/no-delete
  }

  // remove thought from contextViews
  const contextViewsNew = { ...state.contextViews }
  delete contextViewsNew[parent.id] // eslint-disable-line fp/no-delete

  const subthoughts = getAllChildrenAsThoughts(state, context).filter(child => child.id !== thought.id)

  /** Generates a firebase update object that can be used to delete/update all descendants and delete/update contextIndex. */
  const recursiveDeletes = (thoughts: Context, accumRecursive = {} as ThoughtUpdates): ThoughtUpdates => {
    // modify the state to use the thoughtIndex with newOldThought
    // this ensures that contexts are calculated correctly for descendants with duplicate values
    const stateNew: State = {
      ...state,
      thoughts: {
        ...state.thoughts,
        thoughtIndex: thoughtIndexNew,
      },
    }

    const parent = getParent(stateNew, thoughts)

    if (!parent) return accumRecursive

    return getChildrenRanked(stateNew, thoughts).reduce(
      (accum, child) => {
        const hashedKey = hashThought(child.value)
        const lexeme = getLexeme(stateNew, child.value)
        const childNew =
          lexeme && lexeme.contexts && lexeme.contexts.length > 1
            ? // update child with deleted context removed
              removeContext(state, lexeme, thoughts, child.rank)
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
          } as ThoughtUpdates
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
          [parent.id]: null,
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
    [key]: newOldThought,
    ...descendantUpdatesResult.thoughtIndex,
    // emptyContextDelete
  }

  const contextIndexUpdates = {
    // Deleted thought's parent
    [parent.id]: {
      ...parent,
      children: subthoughts.map(({ id }) => id),
      lastUpdated: timestamp(),
    } as Parent,
    [deletedThought.id]: null,
    // TODO: How to remove descendant dependency with delete.
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
