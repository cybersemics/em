// util
import {
  addContext,
  getChildrenWithRank,
  encodeItems,
  equalArrays,
  equalItemRanked,
  equalItemsRanked,
  getThought,
  hashThought,
  moveItem,
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
export const existingItemMove = (state, { oldItemsRanked, newItemsRanked }) => {

  const data = { ...state.data }
  const oldItems = unrank(oldItemsRanked)
  const newItems = unrank(newItemsRanked)
  const value = head(oldItems)
  const oldRank = headRank(oldItemsRanked)
  const newRank = headRank(newItemsRanked)
  const oldContext = rootedContextOf(oldItems)
  const newContext = rootedContextOf(newItems)
  const sameContext = equalArrays(oldContext, newContext)
  const oldItem = getThought(value, data)
  const newItem = moveItem(oldItem, oldContext, newContext, oldRank, newRank)
  const editing = equalItemsRanked(state.cursorBeforeEdit, oldItemsRanked)

  // preserve contextChildren
  const contextEncodedOld = encodeItems(oldContext)
  const contextNewEncoded = encodeItems(newContext)

  // if the contexts have changed, remove the value from the old contextChildren and add it to the new
  const itemChildrenOld = (state.contextChildren[contextEncodedOld] || [])
    .filter(child => !equalItemRanked(child, { key: value, rank: oldRank }))
  const itemChildrenNew = (state.contextChildren[contextNewEncoded] || [])
    .filter(child => !equalItemRanked(child, { key: value, rank: oldRank }))
    .concat({
      key: value,
      rank: newRank,
      lastUpdated: timestamp()
    })

  const recursiveUpdates = (itemsRanked, contextRecursive = [], accumRecursive = {}) => {

    return getChildrenWithRank(itemsRanked, state.data, state.contextChildren).reduce((accum, child) => {
      const hashedKey = hashThought(child.key)
      const childItem = getThought(child.key, data)

      // remove and add the new context of the child
      const contextNew = newItems.concat(contextRecursive)
      const childNew = addContext(removeContext(childItem, unrank(itemsRanked), child.rank), contextNew, child.rank)

      // update local data so that we do not have to wait for firebase
      data[hashedKey] = childNew

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
          data: childNew,
          context: unrank(itemsRanked),
          contextsOld: ((accumRecursive[hashedKey] || {}).contextsOld || []).concat([unrank(itemsRanked)]),
          contextsNew: ((accumRecursive[hashedKey] || {}).contextsNew || []).concat([contextNew])
        }
      }

      return {
        ...accumNew,
        ...recursiveUpdates(itemsRanked.concat(child), contextRecursive.concat(child.key), accumNew)
      }
    }, {})
  }

  const descendantUpdatesResult = recursiveUpdates(oldItemsRanked)
  const descendantUpdates = reduceObj(descendantUpdatesResult, (key, value) => ({
      [key]: value.data
  }))

  const contextChildrenDescendantUpdates = sameContext
    ? {}
    : reduceObj(descendantUpdatesResult, (hashedKey, result, accumContexts) =>
      result.contextsOld.reduce((accum, contextOld, i) => {
        const contextNew = result.contextsNew[i]
        const contextEncodedOld = encodeItems(contextOld)
        const contextNewEncoded = encodeItems(contextNew)
        return {
          ...accum,
          [contextEncodedOld]: (accumContexts[contextEncodedOld] || state.contextChildren[contextEncodedOld] || [])
            .filter(child => child.key !== result.key),
          [contextNewEncoded]: (accumContexts[contextNewEncoded] || state.contextChildren[contextNewEncoded] || [])
            .concat({
              key: result.key,
              rank: result.rank,
              lastUpdated: timestamp()
            })
        }
      }, {})
    )

  const contextChildrenUpdates = {
    [contextEncodedOld]: itemChildrenOld,
    [contextNewEncoded]: itemChildrenNew,
    ...contextChildrenDescendantUpdates
  }

  const newContextChildren = {
    ...state.contextChildren,
    ...contextChildrenUpdates
  }
  Object.keys(newContextChildren).forEach(contextEncoded => {
    const itemChildren = newContextChildren[contextEncoded]
    if (!itemChildren || itemChildren.length === 0) {
      delete newContextChildren[contextEncoded] // eslint-disable-line fp/no-delete
    }
  })

  const dataUpdates = {
    [hashThought(value)]: newItem,
    ...descendantUpdates
  }

  data[hashThought(value)] = newItem

  setTimeout(() => {
    // do not sync to state since this reducer returns the new state
    sync(dataUpdates, contextChildrenUpdates, { state: false })

    if (editing) {
      updateUrlHistory(newItemsRanked, { replace: true })
    }
  })

  return {
    data,
    dataNonce: state.dataNonce + 1,
    cursor: editing ? newItemsRanked : state.cursor,
    cursorBeforeEdit: editing ? newItemsRanked : state.cursorBeforeEdit,
    contextChildren: newContextChildren
  }
}
