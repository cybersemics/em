// util
import {
  equalThoughtRanked,
  exists,
  expandThoughts,
  getThoughtsRanked,
  getThought,
  hashContext,
  hashThought,
  removeContext,
  rootedContextOf,
  sync,
  rankThoughtsFirstMatch,
} from '../util'

// reducers
import render from './render'

import { treeDelete } from '../util/recentlyEditedTree'

// SIDE EFFECTS: sync
export default (state, { context, thoughtRanked, showContexts }) => {

  const { value, rank } = thoughtRanked
  if (!exists(value, state.thoughtIndex)) return

  const thoughts = context.concat(value)
  const key = hashThought(value)
  const thought = getThought(value, state.thoughtIndex)
  context = rootedContextOf(thoughts)
  const contextEncoded = hashContext(context)
  const thoughtIndexNew = { ...state.thoughtIndex }
  const oldRankedThoughts = rankThoughtsFirstMatch(thoughts, { state })

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

  // remove thought from proseViews and contextViews
  const contextViewsNew = { ...state.contextViews }
  delete contextViewsNew[contextEncoded] // eslint-disable-line fp/no-delete

  const subthoughts = (state.contextIndex[contextEncoded] || [])
    .filter(child => !equalThoughtRanked(child, { value, rank }))

  // generates a firebase update object that can be used to delete/update all descendants and delete/update contextIndex
  const recursiveDeletes = (thoughts, accumRecursive = {}) => {
    return getThoughtsRanked(thoughts, thoughtIndexNew, state.contextIndex).reduce((accum, child) => {
      const hashedKey = hashThought(child.value)
      const childThought = getThought(child.value, thoughtIndexNew)
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
    [contextEncoded]: subthoughts.length > 0 ? subthoughts : null,
    // descendants
    ...descendantUpdatesResult.contextIndex
  }
  const contextIndexNew = Object.assign({}, state.contextIndex, contextIndexUpdates)

  // null values must be manually deleted in state
  // current thought
  if (!subthoughts || subthoughts.length === 0) {
    delete contextIndexNew[contextEncoded] // eslint-disable-line fp/no-delete
  }
  // descendants
  Object.keys(descendantUpdatesResult.contextIndex).forEach(contextEncoded => {
    const subthoughts = descendantUpdatesResult.contextIndex[contextEncoded]
    if (!subthoughts || subthoughts.length === 0) {
      delete contextIndexNew[contextEncoded] // eslint-disable-line fp/no-delete
    }
  })

  setTimeout(() => {
    // do not sync to state since this reducer returns the new state
    sync(thoughtIndexUpdates, contextIndexUpdates, { state: false, recentlyEdited })
  })

  return {
    ...render(state),
    thoughtIndex: thoughtIndexNew,
    contextIndex: contextIndexNew,
    expanded: expandThoughts(state.cursor, thoughtIndexNew, contextIndexNew, contextViewsNew),
    contextViews: contextViewsNew,
    recentlyEdited
  }
}
