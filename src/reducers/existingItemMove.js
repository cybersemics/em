// util
import {
  getChildrenWithRank,
  encodeItems,
  equalArrays,
  equalItemRanked,
  equalItemsRanked,
  moveItem,
  removeContext,
  rootedIntersections,
  signifier,
  sigRank,
  syncRemoteData,
  timestamp,
  unrank,
  unroot,
  updateUrlHistory,
} from '../util.js'

// side effect: sync
export const existingItemMove = (state, { oldItemsRanked, newItemsRanked }) => {

  const data = Object.assign({}, state.data)
  const oldItems = unrank(oldItemsRanked)
  const newItems = unrank(newItemsRanked)
  const value = signifier(oldItems)
  const oldRank = sigRank(oldItemsRanked)
  const newRank = sigRank(newItemsRanked)
  const oldContext = rootedIntersections(oldItems)
  const newContext = rootedIntersections(newItems)
  const sameContext = equalArrays(oldContext, newContext)
  const oldItem = data[value]
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

  const recursiveUpdates = (itemsRanked, inheritance=[]) => {

    return getChildrenWithRank(itemsRanked, state.data, state.contextChildren).reduce((accum, child) => {
      const childItem = state.data[child.key]

      // remove and add the new context of the child
      const childNew = removeContext(childItem, unrank(itemsRanked), child.rank)
      childNew.memberOf.push({
        context: newItems.concat(inheritance),
        rank: child.rank
      })

      // update local data so that we do not have to wait for firebase
      data[child.key] = childNew

      return Object.assign(accum,
        {
          [child.key]: {
            data: childNew,
            context: unrank(itemsRanked),
            rank: child.rank
          }
        },
        recursiveUpdates(itemsRanked.concat(child), inheritance.concat(child.key))
      )
    }, {})
  }

  const recUpdatesResult = recursiveUpdates(oldItemsRanked)
  const recUpdates = Object.keys(recUpdatesResult).reduce((accum, key) =>
    Object.assign({}, accum, {
      [key]: recUpdatesResult[key].data
    })
  , {})

  const contextChildrenRecursiveUpdates = sameContext
    ? {}
    : Object.keys(recUpdatesResult).reduce((accum, key) => {
      const contextEncodedOld = encodeItems(recUpdatesResult[key].context)
      const contextNewEncoded = encodeItems(newItems.concat(recUpdatesResult[key].context.slice(newItems.length + unroot(oldContext).length - unroot(newContext).length)))

      return Object.assign({}, accum, {
        [contextEncodedOld]: (accum[contextEncodedOld] || state.contextChildren[contextEncodedOld] || [])
          .filter(child => child.key !== key),
        [contextNewEncoded]: (accum[contextNewEncoded] || state.contextChildren[contextNewEncoded] || [])
          .concat({
            key,
            rank: recUpdatesResult[key].rank,
            lastUpdated: timestamp()
          })
      })
    }, {})

  const contextChildrenUpdates = Object.assign({
    [contextEncodedOld]: itemChildrenOld,
    [contextNewEncoded]: itemChildrenNew,
  }, contextChildrenRecursiveUpdates)
  const newContextChildren = Object.assign({}, state.contextChildren, contextChildrenUpdates)

  for (let contextEncoded in newContextChildren) {
    const itemChildren = newContextChildren[contextEncoded]
    if (!itemChildren || itemChildren.length === 0) {
      delete newContextChildren[contextEncoded]
    }
  }

  const updates = Object.assign(
    {
      [value]: newItem
    },
    // RECURSIVE
    recUpdates
  )

  data[value] = newItem

  setTimeout(() => {

    // localStorage
    localStorage['data-' + value] = JSON.stringify(newItem)

    for (let key in recUpdates) {
      localStorage['data-' + key] = JSON.stringify(recUpdates[key])
    }

    for (let contextEncoded in contextChildrenUpdates) {
      const itemNewChildren = contextChildrenUpdates[contextEncoded]
      if (itemNewChildren && itemNewChildren.length > 0) {
        localStorage['contextChildren' + contextEncoded] = JSON.stringify(itemNewChildren)
      }
      else {
        delete localStorage['contextChildren' + contextEncoded]
      }
    }

    localStorage.lastUpdated = timestamp()

    // remote
    syncRemoteData(updates, contextChildrenUpdates)
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
