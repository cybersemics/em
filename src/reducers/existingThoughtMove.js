// util
import {
  addContext,
  getChildrenWithRank,
  hashContext,
  equalArrays,
  equalThoughtRanked,
  equalThoughtsRanked,
  getThought,
  hashThought,
  moveThought,
  reduceObj,
  removeContext,
  rootedContextOf,
  head,
  headRank,
  sync,
  timestamp,
  unrank,
  updateUrlHistory,
} from '../util.js'

// side effect: sync
export const existingThoughtMove = (state, { oldThoughtsRanked, newThoughtsRanked }) => {

  const thoughtIndex = { ...state.thoughtIndex }
  const oldThoughts = unrank(oldThoughtsRanked)
  const newThoughts = unrank(newThoughtsRanked)
  const value = head(oldThoughts)
  const oldRank = headRank(oldThoughtsRanked)
  const newRank = headRank(newThoughtsRanked)
  const oldContext = rootedContextOf(oldThoughts)
  const newContext = rootedContextOf(newThoughts)
  const sameContext = equalArrays(oldContext, newContext)
  const oldThought = getThought(value, thoughtIndex)
  const newThought = moveThought(oldThought, oldContext, newContext, oldRank, newRank)
  const editing = equalThoughtsRanked(state.cursorBeforeEdit, oldThoughtsRanked)

  // preserve contextIndex
  const contextEncodedOld = hashContext(oldContext)
  const contextNewEncoded = hashContext(newContext)

  // if the contexts have changed, remove the value from the old contextIndex and add it to the new
  const thoughtChildrenOld = (state.contextIndex[contextEncodedOld] || [])
    .filter(child => !equalThoughtRanked(child, { key: value, rank: oldRank }))
  const thoughtChildrenNew = (state.contextIndex[contextNewEncoded] || [])
    .filter(child => !equalThoughtRanked(child, { key: value, rank: oldRank }))
    .concat({
      key: value,
      rank: newRank,
      lastUpdated: timestamp()
    })

  const recursiveUpdates = (thoughtsRanked, contextRecursive = [], accumRecursive = {}) => {

    return getChildrenWithRank(thoughtsRanked, state.thoughtIndex, state.contextIndex).reduce((accum, child) => {
      const hashedKey = hashThought(child.key)
      const childThought = getThought(child.key, thoughtIndex)

      // remove and add the new context of the child
      const contextNew = newThoughts.concat(contextRecursive)
      const childNew = addContext(removeContext(childThought, unrank(thoughtsRanked), child.rank), contextNew, child.rank)

      // update local thoughtIndex so that we do not have to wait for firebase
      thoughtIndex[hashedKey] = childNew

      const accumNew = {
        // merge ancestor updates
        ...accumRecursive,
        // merge sibling updates
        // Order matters: accum must have precendence over accumRecursive so that contextNew is correct
        ...accum,
        // merge current thought update
        [hashedKey]: {
          key: child.key,
          rank: child.rank,
          thoughtIndex: childNew,
          context: unrank(thoughtsRanked),
          contextsOld: ((accumRecursive[hashedKey] || {}).contextsOld || []).concat([unrank(thoughtsRanked)]),
          contextsNew: ((accumRecursive[hashedKey] || {}).contextsNew || []).concat([contextNew])
        }
      }

      return {
        ...accumNew,
        ...recursiveUpdates(thoughtsRanked.concat(child), contextRecursive.concat(child.key), accumNew)
      }
    }, {})
  }

  const descendantUpdatesResult = recursiveUpdates(oldThoughtsRanked)
  const descendantUpdates = reduceObj(descendantUpdatesResult, (key, value) => ({
      [key]: value.thoughtIndex
  }))

  const contextIndexDescendantUpdates = sameContext
    ? {}
    : reduceObj(descendantUpdatesResult, (hashedKey, result, accumContexts) =>
      result.contextsOld.reduce((accum, contextOld, i) => {
        const contextNew = result.contextsNew[i]
        const contextEncodedOld = hashContext(contextOld)
        const contextNewEncoded = hashContext(contextNew)
        return {
          ...accum,
          [contextEncodedOld]: (accumContexts[contextEncodedOld] || state.contextIndex[contextEncodedOld] || [])
            .filter(child => child.key !== result.key),
          [contextNewEncoded]: (accumContexts[contextNewEncoded] || state.contextIndex[contextNewEncoded] || [])
            .concat({
              key: result.key,
              rank: result.rank,
              lastUpdated: timestamp()
            })
        }
      }, {})
    )

  const contextIndexUpdates = {
    [contextEncodedOld]: thoughtChildrenOld,
    [contextNewEncoded]: thoughtChildrenNew,
    ...contextIndexDescendantUpdates
  }

  const newcontextIndex = {
    ...state.contextIndex,
    ...contextIndexUpdates
  }
  Object.keys(newcontextIndex).forEach(contextEncoded => {
    const thoughtChildren = newcontextIndex[contextEncoded]
    if (!thoughtChildren || thoughtChildren.length === 0) {
      delete newcontextIndex[contextEncoded] // eslint-disable-line fp/no-delete
    }
  })

  const thoughtIndexUpdates = {
    [hashThought(value)]: newThought,
    ...descendantUpdates
  }

  thoughtIndex[hashThought(value)] = newThought

  setTimeout(() => {
    // do not sync to state since this reducer returns the new state
    sync(thoughtIndexUpdates, contextIndexUpdates, { state: false })

    if (editing) {
      updateUrlHistory(newThoughtsRanked, { replace: true })
    }
  })

  return {
    thoughtIndex,
    dataNonce: state.dataNonce + 1,
    cursor: editing ? newThoughtsRanked : state.cursor,
    cursorBeforeEdit: editing ? newThoughtsRanked : state.cursorBeforeEdit,
    contextIndex: newcontextIndex
  }
}
