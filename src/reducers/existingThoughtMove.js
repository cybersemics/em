// util
import {
  addContext,
  compareByRank,
  equalArrays,
  equalThoughtRanked,
  equalThoughtValue,
  getNextRank,
  getThought,
  getThoughtsRanked,
  hashContext,
  hashThought,
  head,
  headRank,
  moveThought,
  pathToContext,
  reduceObj,
  removeContext,
  removeDuplicatedContext,
  rootedContextOf,
  sort,
  subsetThoughts,
  sync,
  timestamp,
  updateUrlHistory,
} from '../util'

import { treeMove } from '../util/recentlyEditedTree'

// side effect: sync
export default (state, { oldPath, newPath, offset }) => {
  const thoughtIndexNew = { ...state.thoughtIndex }
  const oldThoughts = pathToContext(oldPath)
  const newThoughts = pathToContext(newPath)
  const value = head(oldThoughts)
  const key = hashThought(value)
  const oldRank = headRank(oldPath)
  const newRank = headRank(newPath)
  const oldContext = rootedContextOf(oldThoughts)
  const newContext = rootedContextOf(newThoughts)
  const sameContext = equalArrays(oldContext, newContext)
  const oldThought = getThought(value, thoughtIndexNew)
  const newThought = removeDuplicatedContext(moveThought(oldThought, oldContext, newContext, oldRank, newRank), newContext)
  const isPathInCursor = subsetThoughts(state.cursor, oldPath)

  // Uncaught TypeError: Cannot perform 'IsArray' on a proxy that has been revoked at Function.isArray (#417)
  let recentlyEdited = state.recentlyEdited // eslint-disable-line fp/no-let
  try {
    recentlyEdited = treeMove(state.recentlyEdited, oldPath, newPath)
  }
  catch (e) {
    console.error('existingThoughtMove: treeMove immer error')
    console.error(e)
  }

  // preserve contextIndex
  const contextEncodedOld = hashContext(oldContext)
  const contextEncodedNew = hashContext(newContext)

  // if the contexts have changed, remove the value from the old contextIndex and add it to the new
  const subthoughtsOld = (state.contextIndex[contextEncodedOld] || [])
    .filter(child => !equalThoughtRanked(child, { value, rank: oldRank }))

  const duplicateSubthought = sort((state.contextIndex[contextEncodedNew] || []), compareByRank)
    .find(equalThoughtValue(value))

  const subthoughtsNew = (state.contextIndex[contextEncodedNew] || [])
    .filter(child => !equalThoughtRanked(child, { value, rank: oldRank }, sameContext))
    .concat({
      value,
      rank: (duplicateSubthought && !sameContext) ? duplicateSubthought.rank : newRank,
      lastUpdated: timestamp()
    })

  const recursiveUpdates = (oldThoughtsRanked, newThoughtsRanked, contextRecursive = [], accumRecursive = {}) => {

    const newLastRank = getNextRank(newThoughtsRanked, state.thoughtIndex, state.contextIndex)

    return getThoughtsRanked(oldThoughtsRanked, state.thoughtIndex, state.contextIndex).reduce((accum, child, i) => {
      const hashedKey = hashThought(child.value)
      const childThought = getThought(child.value, thoughtIndexNew)

      // remove and add the new context of the child
      const contextNew = newThoughts.concat(contextRecursive)

      // update rank of first depth of childs
      const movedRank = newLastRank ? newLastRank + i : child.rank
      const childNewThought = removeDuplicatedContext(addContext(removeContext(childThought, pathToContext(oldThoughtsRanked), child.rank), contextNew, movedRank), contextNew)

      // update local thoughtIndex so that we do not have to wait for firebase
      thoughtIndexNew[hashedKey] = childNewThought

      const accumNew = {
        // merge ancestor updates
        ...accumRecursive,
        // merge sibling updates
        // Order matters: accum must have precendence over accumRecursive so that contextNew is correct
        ...accum,
        // merge current thought update
        [hashedKey]: {
          value: child.value,
          rank: (childNewThought.contexts || []).find(context => equalArrays(context.context, contextNew)).rank,
          thoughtIndex: childNewThought,
          context: pathToContext(oldThoughtsRanked),
          contextsOld: ((accumRecursive[hashedKey] || {}).contextsOld || []).concat([pathToContext(oldThoughtsRanked)]),
          contextsNew: ((accumRecursive[hashedKey] || {}).contextsNew || []).concat([contextNew])
        }
      }

      return {
        ...accumNew,
        ...recursiveUpdates(oldThoughtsRanked.concat(child), newThoughtsRanked.concat(child), contextRecursive.concat(child.value), accumNew)
      }
    }, {})
  }

  const descendantUpdatesResult = recursiveUpdates(oldPath, newPath)
  const descendantUpdates = reduceObj(descendantUpdatesResult, (key, value) => ({
    [key]: value.thoughtIndex
  }))

  const contextIndexDescendantUpdates = sameContext
    ? {}
    : reduceObj(descendantUpdatesResult, (hashedKey, result, accumContexts) =>
      result.contextsOld.reduce((accum, contextOld, i) => {
        const contextNew = result.contextsNew[i]
        const contextEncodedOld = hashContext(contextOld)
        const contextEncodedNew = hashContext(contextNew)
        return {
          ...accum,
          [contextEncodedOld]: (accumContexts[contextEncodedOld] || state.contextIndex[contextEncodedOld] || [])
            .filter(child => child.value !== result.value),
          [contextEncodedNew]: (accumContexts[contextEncodedNew] || state.contextIndex[contextEncodedNew] || [])
            .filter(child => child.value !== result.value)
            .concat({
              value: result.value,
              rank: result.rank,
              lastUpdated: timestamp()
            })
        }
      }, {})
    )

  const contextIndexUpdates = {
    [contextEncodedOld]: subthoughtsOld,
    [contextEncodedNew]: subthoughtsNew,
    ...contextIndexDescendantUpdates
  }

  const contextIndexNew = {
    ...state.contextIndex,
    ...contextIndexUpdates
  }

  Object.keys(contextIndexNew).forEach(contextEncoded => {
    const subthoughts = contextIndexNew[contextEncoded]
    if (!subthoughts || subthoughts.length === 0) {
      delete contextIndexNew[contextEncoded] // eslint-disable-line fp/no-delete
    }
  })

  const thoughtIndexUpdates = {
    [key]: newThought,
    ...descendantUpdates
  }

  thoughtIndexNew[key] = newThought

  // preserve contextViews
  const contextViewsNew = { ...state.contextViews }
  if (state.contextViews[contextEncodedNew] !== state.contextViews[contextEncodedOld]) {
    contextViewsNew[contextEncodedNew] = state.contextViews[contextEncodedOld]
    delete contextViewsNew[contextEncodedOld] // eslint-disable-line fp/no-delete
  }

  setTimeout(() => {
    // do not sync to state since this reducer returns the new state
    sync(thoughtIndexUpdates, contextIndexUpdates, { state: false, recentlyEdited })

    if (isPathInCursor) {
      updateUrlHistory(newPath, { replace: true })
    }
  })

  const cursorDescendantPath = (state.cursor || []).slice(oldPath.length)

  const newCursorPath = isPathInCursor
    ? newPath.concat(cursorDescendantPath)
    : state.cursor

  return {
    thoughtIndex: thoughtIndexNew,
    dataNonce: state.dataNonce + 1,
    cursor: newCursorPath,
    cursorBeforeEdit: newCursorPath,
    cursorOffset: offset,
    contextIndex: contextIndexNew,
    contextViews: contextViewsNew,
    recentlyEdited
  }
}
