// util
import {
  getChildrenWithRank,
  encodeItems,
  equalItemRanked,
  exists,
  removeContext,
  rootedIntersections,
  signifier,
  syncRemoteData,
  timestamp,
  unrank,
} from '../util.js'

// SIDE EFFECTS: syncRemoteData, localStorage
export const existingItemDelete = (state, { itemsRanked, rank, showContexts }) => {

  const items = unrank(itemsRanked)
  if (!exists(signifier(items), state.data)) return

  const value = signifier(items)
  const item = state.data[value]
  const context = rootedIntersections(items)
  const newData = Object.assign({}, state.data)

  // the old item less the context
  const newOldItem = item.memberOf && item.memberOf.length > 1
    ? removeContext(item, context, showContexts ? null : rank)
    : null

  // update local data so that we do not have to wait for firebase
  if (newOldItem) {
    newData[value] = newOldItem
  }
  else {
    delete newData[value]
  }

  const contextEncoded = encodeItems(context)
  const itemChildren = (state.contextChildren[contextEncoded] || [])
    .filter(child => !equalItemRanked(child, { key: value, rank }))

  // if removing an item from a context via the context view and the context has no more members or contexts, delete the context
  // const isItemOldOrphan = () => !item.memberOf || item.memberOf.length < 2
  // const isItemOldChildless = () => getChildrenWithRank([value], newData).length < 2
  let emptyContextDelete = {}
  // if(showContexts && getChildrenWithRank(intersections(items), newData).length === 0) {
    // const emptyContextValue = signifier(intersections(items))
    // delete newData[emptyContextValue]
    // delete localStorage['data-' + emptyContextValue]
    // emptyContextDelete = {
    //   [emptyContextValue]: null
    // }
  // }

  // generates a firebase update object that can be used to delete/update all descendants and delete/update contextChildren
  const recursiveDeletes = itemsRanked => {
    return getChildrenWithRank(itemsRanked, newData, state.contextChildren).reduce((accum, child) => {
      const childItem = newData[child.key]
      const childNew = childItem && childItem.memberOf && childItem.memberOf.length > 1
        // update child with deleted context removed
        ? removeContext(childItem, unrank(itemsRanked), child.rank)
        // if this was the only context of the child, delete the child
        : null

      // update local data so that we do not have to wait for firebase
      if (childNew) {
        newData[child.key] = childNew
      }
      else {
        delete newData[child.key]
      }

      return Object.assign(accum,
        { [child.key]: {
          data: childNew,
          context: unrank(itemsRanked)
        }}, // direct child
        recursiveDeletes(itemsRanked.concat(child)) // RECURSIVE
      )
    }, {})
  }

  // do not delete descendants when the thought has a duplicate sibling
  const duplicateSiblings = itemChildren.filter(child => child.key === value)
  const deleteUpdatesResult = duplicateSiblings.length === 0
    ? recursiveDeletes(itemsRanked)
    : {}
  const deleteUpdates = Object.keys(deleteUpdatesResult).reduce((accum, key) =>
    Object.assign({}, accum, {
      [key]: deleteUpdatesResult[key].data
    })
  , {})

  const contextChildrenRecursiveUpdates = Object.keys(deleteUpdatesResult).reduce((accum, key) => {
    const encodedContextRecursive = encodeItems(deleteUpdatesResult[key].context)
    return Object.assign({}, accum, {
      [encodedContextRecursive]: (accum[encodedContextRecursive] || state.contextChildren[encodedContextRecursive] || [])
        .filter(child => child.key !== key),
    })
  }, {})

  setTimeout(() => {

    // localStorage
    if (newOldItem) {
      localStorage['data-' + value] = JSON.stringify(newOldItem)
    }
    else {
      delete localStorage['data-' + value]
    }

    for (let key in deleteUpdates) {
      const childNew = deleteUpdates[key]
      if (childNew) {
        localStorage['data-' + key] = JSON.stringify(childNew)
      }
      else {
        delete localStorage['data-' + key]
      }
    }

    if (itemChildren.length > 0) {
      localStorage['contextChildren' + contextEncoded] = JSON.stringify(itemChildren)
    }
    else {
      delete localStorage['contextChildren' + contextEncoded]
    }

    for (let contextEncoded in contextChildrenRecursiveUpdates) {
      const itemChildren = contextChildrenRecursiveUpdates[contextEncoded]
      if (itemChildren && itemChildren.length > 0) {
        localStorage['contextChildren' + contextEncoded] = JSON.stringify(itemChildren)
      }
      else {
        delete localStorage['contextChildren' + contextEncoded]
      }
    }

    localStorage.lastUpdated = timestamp()
  })

  const updates = Object.assign(
    {
      [value]: newOldItem
    },
    deleteUpdates,
    emptyContextDelete
  )

  const contextChildrenUpdates = Object.assign({
    [contextEncoded]: itemChildren.length > 0 ? itemChildren : null
  }, contextChildrenRecursiveUpdates)
  const newContextChildren = Object.assign({}, state.contextChildren, contextChildrenUpdates)

  if (!itemChildren || itemChildren.length === 0) {
    delete newContextChildren[contextEncoded]
  }

  for (let contextEncoded in contextChildrenRecursiveUpdates) {
    const itemChildren = contextChildrenRecursiveUpdates[contextEncoded]
    if (!itemChildren || itemChildren.length === 0) {
      delete newContextChildren[contextEncoded]
    }
  }

  setTimeout(() => {
    syncRemoteData(updates, contextChildrenUpdates)
  })

  return {
    data: Object.assign({}, newData),
    dataNonce: state.dataNonce + 1,
    contextChildren: newContextChildren
  }
}
