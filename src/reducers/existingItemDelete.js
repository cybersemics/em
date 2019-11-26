// util
import {
  encodeItems,
  equalItemRanked,
  exists,
  getChildrenWithRank,
  getThought,
  hashThought,
  removeContext,
  rootedIntersections,
  signifier,
  sync,
  unrank,
} from '../util.js'

// SIDE EFFECTS: sync
export const existingItemDelete = (state, { itemsRanked, rank, showContexts }) => {

  const items = unrank(itemsRanked)
  if (!exists(signifier(items), state.data)) return

  const value = signifier(items)
  const item = getThought(value, state.data)
  const context = rootedIntersections(items)
  const newData = { ...state.data }

  // the old item less the context
  const newOldItem = item.memberOf && item.memberOf.length > 1
    ? removeContext(item, context, showContexts ? null : rank)
    : null

  // update local data so that we do not have to wait for firebase
  if (newOldItem) {
    newData[hashThought(value)] = newOldItem
  }
  else {
    delete newData[hashThought(value)] // eslint-disable-line fp/no-delete
  }

  const contextEncoded = encodeItems(context)
  const itemChildren = (state.contextChildren[contextEncoded] || [])
    .filter(child => !equalItemRanked(child, { key: value, rank }))

  // generates a firebase update object that can be used to delete/update all descendants and delete/update contextChildren
  const recursiveDeletes = (itemsRanked, accumRecursive = {}) => {
    return getChildrenWithRank(itemsRanked, newData, state.contextChildren).reduce((accum, child) => {
      const hashedKey = hashThought(child.key)
      const childItem = getThought(child.key, newData)
      const childNew = childItem && childItem.memberOf && childItem.memberOf.length > 1
        // update child with deleted context removed
        ? removeContext(childItem, unrank(itemsRanked), child.rank)
        // if this was the only context of the child, delete the child
        : null

      // update local data so that we do not have to wait for firebase
      if (childNew) {
        newData[hashedKey] = childNew
      }
      else {
        delete newData[hashedKey] // eslint-disable-line fp/no-delete
      }

      const contextEncoded = encodeItems(unrank(itemsRanked))

      const dataMerged = {
        ...accumRecursive.data,
        ...accum.data,
        [hashedKey]: childNew
      }

      const contextChildrenMerged = {
        ...accumRecursive.contextChildren,
        ...accum.contextChildren,
        [contextEncoded]: null
      }

      // RECURSION
      const recursiveResults = recursiveDeletes(itemsRanked.concat(child), {
        data: dataMerged,
        contextChildren: contextChildrenMerged
      })

      return {
        data: {
          ...dataMerged,
          ...recursiveResults.data
        },
        contextChildren: {
          ...contextChildrenMerged,
          ...recursiveResults.contextChildren
        }
      }
    }, {
      data: {},
      contextChildren: {}
    })
  }

  // do not delete descendants when the thought has a duplicate sibling
  const hasDuplicateSiblings = itemChildren.some(child => hashThought(child.key) === hashThought(value))
  const descendantUpdatesResult = !hasDuplicateSiblings
    ? recursiveDeletes(itemsRanked)
    : {
      data: {},
      contextChildren: {}
    }

  const dataUpdates = {
    [hashThought(value)]: newOldItem,
    ...descendantUpdatesResult.data,
    // emptyContextDelete
  }

  const contextChildrenUpdates = {
    // current thought
    [contextEncoded]: itemChildren.length > 0 ? itemChildren : null,
    // descendants
    ...descendantUpdatesResult.contextChildren
  }
  const newContextChildren = Object.assign({}, state.contextChildren, contextChildrenUpdates)

  // null values must be manually deleted in state
  // current thought
  if (!itemChildren || itemChildren.length === 0) {
    delete newContextChildren[contextEncoded] // eslint-disable-line fp/no-delete
  }
  // descendants
  Object.keys(descendantUpdatesResult.contextChildren).forEach(contextEncoded => {
    const itemChildren = descendantUpdatesResult.contextChildren[contextEncoded]
    if (!itemChildren || itemChildren.length === 0) {
      delete newContextChildren[contextEncoded] // eslint-disable-line fp/no-delete
    }
  })

  setTimeout(() => {
    // do not sync to state since this reducer returns the new state
    sync(dataUpdates, contextChildrenUpdates, { state: false })
  })

  return {
    data: newData,
    dataNonce: state.dataNonce + 1,
    contextChildren: newContextChildren
  }
}
