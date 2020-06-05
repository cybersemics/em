import { render, updateThoughts } from '../reducers'
import { treeDelete } from '../util/recentlyEditedTree'
import { exists, getThought, getThoughts, getThoughtsRanked, rankThoughtsFirstMatch } from '../selectors'

// util
import {
  equalArrays,
  equalThoughtRanked,
  hashContext,
  hashThought,
  reducerFlow,
  removeContext,
  rootedContextOf,
  timestamp,
} from '../util'

/** Removes a thought from a context. If it was the last thought in that context, removes it completely from the thoughtIndex. */
export default (state, { context, thoughtRanked, showContexts }) => {

  const { value, rank } = thoughtRanked
  if (!exists(state, value)) return state

  const thoughts = context.concat(value)
  const key = hashThought(value)
  const thought = getThought(state, value)
  context = rootedContextOf(thoughts)
  const contextEncoded = hashContext(context)
  const thoughtIndexNew = { ...state.thoughts.thoughtIndex }
  const oldRankedThoughts = rankThoughtsFirstMatch(state, thoughts)

  const isValidThought = thought.contexts.find(parent => equalArrays(context, parent.context) && rank === parent.rank)

  // if thought is not valid then just stop further execution
  if (!isValidThought) {
    console.error(`Thought ${value} with rank ${rank} is not valid!`)
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
    ? removeContext(thought, context, showContexts ? null : rank)
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

  const subthoughts = getThoughts(state, context)
    .filter(child => !equalThoughtRanked(child, { value, rank }))

  /** Generates a firebase update object that can be used to delete/update all descendants and delete/update contextIndex. */
  const recursiveDeletes = (thoughts, accumRecursive = {}) => {
    return getThoughtsRanked({
      thoughts: {
        contextIndex: state.thoughts.contextIndex,
        thoughtIndex: thoughtIndexNew
      }
    }, thoughts).reduce((accum, child) => {
      const hashedKey = hashThought(child.value)
      const childThought = getThought({ ...state, thoughtIndex: thoughtIndexNew }, child.value)
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

      const contextEncoded = hashContext(thoughts)

      const dataMerged = {
        ...accumRecursive.thoughtIndex,
        ...accum.thoughtIndex,
        [hashedKey]: childNew
      }

      const contextIndexMerged = {
        ...accumRecursive.contextIndex,
        ...accum.contextIndex,
        [contextEncoded]: null
      }

      // RECURSION
      const recursiveResults = recursiveDeletes(thoughts.concat(child.value), {
        thoughtIndex: dataMerged,
        contextIndex: contextIndexMerged
      })

      return {
        thoughtIndex: {
          ...dataMerged,
          ...recursiveResults.thoughtIndex
        },
        contextIndex: {
          ...contextIndexMerged,
          ...recursiveResults.contextIndex
        }
      }
    }, {
      thoughtIndex: {},
      contextIndex: {}
    })
  }

  // do not delete descendants when the thought has a duplicate sibling
  const hasDuplicateSiblings = subthoughts.some(child => hashThought(child.value || '') === key)
  const descendantUpdatesResult = !hasDuplicateSiblings
    ? recursiveDeletes(thoughts)
    : {
      thoughtIndex: {},
      contextIndex: {}
    }

  const thoughtIndexUpdates = {
    [key]: newOldThought,
    ...descendantUpdatesResult.thoughtIndex,
    // emptyContextDelete
  }

  const contextIndexUpdates = {
    // current thought
    [contextEncoded]: subthoughts.length > 0 ? {
      children: subthoughts,
      lastUpdated: timestamp()
    } : null,
    // descendants
    ...descendantUpdatesResult.contextIndex
  }
  return reducerFlow([
    state => ({ ...state, contextViews: contextViewsNew }),
    state => updateThoughts(state, { thoughtIndexUpdates, contextIndexUpdates, recentlyEdited }),
    render,
  ])(state)
}
