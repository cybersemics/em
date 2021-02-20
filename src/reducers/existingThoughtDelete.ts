import _ from 'lodash'
import { render, updateThoughts } from '../reducers'
import { treeDelete } from '../util/recentlyEditedTree'
import { exists, getThought, getAllChildren, getChildrenRanked, isPending, rankThoughtsFirstMatch, rootedParentOf } from '../selectors'
import { State } from '../util/initialState'
import { Child, Context, Index, Lexeme, Parent } from '../types'

// util
import {
  equalArrays,
  equalThoughtRanked,
  hashContext,
  hashThought,
  reducerFlow,
  removeContext,
  timestamp,
  unroot,
} from '../util'

interface Payload {
  context: Context,
  thoughtRanked: Child,
  showContexts?: boolean,
}

interface ThoughtUpdates {
  contextIndex: Index<Parent | null>,
  thoughtIndex: Index<Lexeme | null>,
  pendingDeletes?: { context: Context, child: Child }[],
}

/** Removes a thought from a context. If it was the last thought in that context, removes it completely from the thoughtIndex. */
const existingThoughtDelete = (state: State, { context, thoughtRanked, showContexts }: Payload) => {

  const { value, rank } = thoughtRanked

  if (!exists(state, value)) return state

  const thoughts = unroot(context.concat(value))
  context = rootedParentOf(state, thoughts)
  const key = hashThought(value)
  const thought = getThought(state, value)

  // guard against missing lexeme (although this should never happen)
  if (!thought) {
    console.error('Lexeme not found', value)
    return state
  }

  const contextEncoded = hashContext(context)
  const thoughtIndexNew = { ...state.thoughts.thoughtIndex }
  const oldRankedThoughts = rankThoughtsFirstMatch(state, thoughts as string[])

  const isValidThought = thought.contexts.find(parent => equalArrays(context, parent.context) && rank === parent.rank)

  // if thought is not valid then just stop further execution
  if (!isValidThought) {
    console.error(`Thought ${value} with rank ${rank} is not in ${JSON.stringify(context)}`)
    return state
  }

  // Uncaught TypeError: Cannot perform 'IsArray' on a proxy that has been revoked at Function.isArray (#417)
  let recentlyEdited = state.recentlyEdited // eslint-disable-line fp/no-let
  try {
    recentlyEdited = treeDelete(state.recentlyEdited, oldRankedThoughts)
  }
  catch (e) {
    console.error('existingThoughtDelete: treeDelete immer error')
    console.error(e)
  }

  // the old thought less the context
  const newOldThought = thought.contexts && thought.contexts.length > 1
    ? removeContext(thought, context, showContexts ? 0 : rank)
    : null

  // update state so that we do not have to wait for firebase
  if (newOldThought) {
    thoughtIndexNew[key] = newOldThought
  }
  else {
    delete thoughtIndexNew[key] // eslint-disable-line fp/no-delete
  }

  // remove thought from contextViews
  const contextViewsNew = { ...state.contextViews }
  delete contextViewsNew[contextEncoded] // eslint-disable-line fp/no-delete

  const subthoughts = getAllChildren(state, context)
    .filter(child => !equalThoughtRanked(child, { value, rank }))

  /** Generates a firebase update object that can be used to delete/update all descendants and delete/update contextIndex. */
  const recursiveDeletes = (thoughts: Context, accumRecursive = {} as ThoughtUpdates): ThoughtUpdates => {
    // modify the state to use the thoughtIndex with newOldThought
    // this ensures that contexts are calculated correctly for descendants with duplicate values
    const stateNew: State = {
      ...state,
      thoughts: {
        ...state.thoughts,
        thoughtIndex: thoughtIndexNew
      }
    }

    return getChildrenRanked(stateNew, thoughts).reduce((accum, child) => {
      const hashedKey = hashThought(child.value)
      const childThought = getThought(stateNew, child.value)
      const childNew = childThought && childThought.contexts && childThought.contexts.length > 1
        // update child with deleted context removed
        ? removeContext(childThought, thoughts, child.rank)
        // if this was the only context of the child, delete the child
        : null

      // update local thoughtIndex so that we do not have to wait for firebase
      if (childNew) {
        thoughtIndexNew[hashedKey] = childNew
      }
      else {
        delete thoughtIndexNew[hashedKey] // eslint-disable-line fp/no-delete
      }

      const thoughtIndexMerged = {
        ...accumRecursive.thoughtIndex,
        ...accum.thoughtIndex,
        [hashedKey]: childNew
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
          // do not delete the pending thought yet since the second call to existingThoughtDelete needs a starting point
          pendingDeletes: [...accumRecursive.pendingDeletes || [], {
            context: thoughts,
            child,
          }],
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
          ...accum.pendingDeletes || [],
          ...accumRecursive.pendingDeletes || [],
          ...recursiveResults.pendingDeletes || [],
        ],
        thoughtIndex: {
          ...thoughtIndexMerged,
          ...recursiveResults.thoughtIndex
        },
        contextIndex: {
          ...contextIndexMerged,
          ...recursiveResults.contextIndex
        }
      }
    }, {
      thoughtIndex: {},
      contextIndex: {
        [hashContext(thoughts)]: null
      },
    } as ThoughtUpdates)
  }

  // do not delete descendants when the thought has a duplicate sibling
  const hasDuplicateSiblings = subthoughts.some(child => hashThought(child.value || '') === key)
  const descendantUpdatesResult = !hasDuplicateSiblings
    ? recursiveDeletes(thoughts)
    : {
      thoughtIndex: {},
      contextIndex: {}
    } as ThoughtUpdates

  const thoughtIndexUpdates = {
    [key]: newOldThought,
    ...descendantUpdatesResult.thoughtIndex,
    // emptyContextDelete
  }

  const contextIndexUpdates = {
    // current thought's Parent
    [contextEncoded]: subthoughts.length > 0 ? {
      id: contextEncoded,
      context,
      children: subthoughts,
      lastUpdated: timestamp()
    } as Parent : null,
    // descendants
    ...descendantUpdatesResult.contextIndex
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
    render,
  ])(state)
}

export default _.curryRight(existingThoughtDelete)
