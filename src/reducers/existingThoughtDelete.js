// util
import {
  hashContext,
  equalThoughtRanked,
  exists,
  getThoughtsRanked,
  getThought,
  hashThought,
  removeContext,
  rootedContextOf,
  head,
  sync,
  pathToContext,
  rankThoughtsFirstMatch,
  subsetThoughts,
  equalPath,
  checkIfPathShareSubcontext,
  timeDifference,
  timestamp,
} from '../util.js'
import sortBy from 'lodash.sortby'
import reverse from 'lodash.reverse'

// SIDE EFFECTS: sync
export default (state, { thoughtsRanked, showContexts }) => {

  const { value, rank } = head(thoughtsRanked)
  if (!exists(value, state.thoughtIndex)) return

  const thoughts = pathToContext(thoughtsRanked)
  const key = hashThought(value)
  const thought = getThought(value, state.thoughtIndex)
  const context = rootedContextOf(thoughts)
  const contextEncoded = hashContext(context)
  const thoughtIndexNew = { ...state.thoughtIndex }
  const oldRankedThoughts = rankThoughtsFirstMatch(thoughts, { state })

  let isMerged = false // eslint-disable-line fp/no-let
  const deletedPathContext = oldRankedThoughts.slice(0, oldRankedThoughts.length - 1)

  /* removing if the old path or it descendants is already in the array */
  const recentlyEdited = reverse(sortBy([...state.recentlyEdited], 'lastUpdated'))
    .filter(recentlyEditedThought => !(equalPath(recentlyEditedThought.path, oldRankedThoughts) || subsetThoughts(recentlyEditedThought.path, oldRankedThoughts)))
    .map(recentlyEditedThought => {
      // checking for availability of majoirty subcontext between two rankedThoughts[]
      const subcontextIndex = checkIfPathShareSubcontext(recentlyEditedThought.path, deletedPathContext)
      const timeDiffInSec = timeDifference(timestamp(), recentlyEditedThought.lastUpdated)

      // this variable sets to true when there is atleast one recently edited thought it can merge to
      if (subcontextIndex > -1 && timeDiffInSec <= 7200) isMerged = true // eslint-disable-line fp/no-mutating-methods

      // here returning the merged path if there is majoirty subcontext available
      return (subcontextIndex > -1 && timeDiffInSec <= 7200) ? { path: deletedPathContext.slice(0, subcontextIndex + 1), lastUpdated: timestamp() } : recentlyEditedThought
    })
    .concat(isMerged ? [] : [{ path: deletedPathContext, lastUpdated: timestamp() }])

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
  const proseViewsNew = { ...state.proseViews }
  const contextViewsNew = { ...state.contextViews }
  delete proseViewsNew[contextEncoded] // eslint-disable-line fp/no-delete
  delete contextViewsNew[contextEncoded] // eslint-disable-line fp/no-delete

  const subthoughts = (state.contextIndex[contextEncoded] || [])
    .filter(child => !equalThoughtRanked(child, { value, rank }))

  // generates a firebase update object that can be used to delete/update all descendants and delete/update contextIndex
  const recursiveDeletes = (thoughtsRanked, accumRecursive = {}) => {
    return getThoughtsRanked(thoughtsRanked, thoughtIndexNew, state.contextIndex).reduce((accum, child) => {
      const hashedKey = hashThought(child.value)
      const childThought = getThought(child.value, thoughtIndexNew)
      const childNew = childThought && childThought.contexts && childThought.contexts.length > 1
        // update child with deleted context removed
        ? removeContext(childThought, pathToContext(thoughtsRanked), child.rank)
        // if this was the only context of the child, delete the child
        : null

      // update local thoughtIndex so that we do not have to wait for firebase
      if (childNew) {
        thoughtIndexNew[hashedKey] = childNew
      }
      else {
        delete thoughtIndexNew[hashedKey] // eslint-disable-line fp/no-delete
      }

      const contextEncoded = hashContext(thoughtsRanked)

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
      const recursiveResults = recursiveDeletes(thoughtsRanked.concat(child), {
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
    ? recursiveDeletes(thoughtsRanked)
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
    thoughtIndex: thoughtIndexNew,
    dataNonce: state.dataNonce + 1,
    contextIndex: contextIndexNew,
    contextViews: contextViewsNew,
    proseViews: proseViewsNew,
    recentlyEdited
  }
}
