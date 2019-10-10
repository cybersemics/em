import { syncRemoteData } from '../store-utils';

import {
  addContext,
  equalItemRanked,
  encodeItems,
  expandItems,
  getChildrenWithRank,
  intersections,
  removeContext,
  rootedIntersections,
  sigKey,
  signifier,
  sigRank,
  timestamp,
  unrank,
  unroot,
  updateUrlHistory
} from '../util.js'

export const existingItemChange = (state) => ({ oldValue, newValue, context, showContexts, itemsRanked, rankInContext, contextChain }) => {

  // items may exist for both the old value and the new value
  const data = Object.assign({}, state.data)
  const key = sigKey(itemsRanked)
  const rank = sigRank(itemsRanked)
  const itemOld = state.data[oldValue]
  const itemCollision = state.data[newValue]
  const itemParentOld = state.data[key]
  const itemsOld = unroot(context).concat(oldValue)
  const itemsNew = unroot(context).concat(newValue)
  const itemsRankedLiveOld = showContexts
    ? intersections(intersections(itemsRanked)).concat({ key: oldValue, rank: sigRank(intersections(itemsRanked)) }).concat(signifier(itemsRanked))
    : intersections(itemsRanked).concat({ key: oldValue, rank })

  const cursorNew = state.cursor.map(item => item.key === oldValue && item.rank === rankInContext
    ? { key: newValue, rank: item.rank }
    : item
  )

  // hasDescendantOfFloatingContext can be done in O(edges)
  const isItemOldOrphan = () => !itemOld.memberOf || itemOld.memberOf.length < 2
  const isItemOldChildless = () => getChildrenWithRank([{ key: oldValue, rank }], state.data, state.contextChildren).length < 2

  // the old item less the context
  const newOldItem = !isItemOldOrphan() || (showContexts && !isItemOldChildless())
    ? removeContext(itemOld, context, rank)
    : null

  // do not add floating item to context
  const newItemWithoutContext = itemCollision || {
    value: newValue,
    memberOf: [],
    created: timestamp(),
    lastUpdated: timestamp()
  }
  const itemNew = itemOld.memberOf.length > 0
    ? addContext(newItemWithoutContext, context, showContexts ? sigRank(rootedIntersections(itemsRankedLiveOld)) : rank)
    : newItemWithoutContext

  // update local data so that we do not have to wait for firebase
  data[newValue] = itemNew
  if (newOldItem) {
    data[oldValue] = newOldItem
  }
  else {
    delete data[oldValue]
  }

  // if context view, change the memberOf of the current thought (which is rendered visually as the parent of the context since are in the context view)
  let itemParentNew
  if (showContexts) {

    itemParentNew = Object.assign({}, itemParentOld, {
      memberOf: removeContext(itemParentOld, intersections(unrank(itemsRankedLiveOld)), rank).memberOf.concat({
        context: itemsNew,
        rank
      }),
      created: itemParentOld.created,
      lastUpdated: timestamp()
    })
    data[key] = itemParentNew
  }

  // preserve context view
  const oldEncoded = encodeItems(unrank(state.cursor))
  const newEncoded = encodeItems(unrank(cursorNew))
  const contextViews = Object.assign({}, state.contextViews)
  if (oldEncoded !== newEncoded) {
    contextViews[newEncoded] = contextViews[oldEncoded]
    delete contextViews[oldEncoded]
  }

  // preserve contextChildren
  const contextNewEncoded = encodeItems(showContexts ? itemsNew : context)
  const itemNewChildren = (state.contextChildren[contextNewEncoded] || [])
    .filter(child =>
      !equalItemRanked(child, { key: oldValue, rank }) &&
      !equalItemRanked(child, { key: newValue, rank })
    )
    .concat({
      key: showContexts ? key : newValue,
      rank,
      lastUpdated: timestamp()
    })

  // preserve contextChildren
  const contextOldEncoded = encodeItems(showContexts ? itemsOld : context)
  const itemOldChildren = (state.contextChildren[contextOldEncoded] || [])
    .filter(child => !equalItemRanked(child, signifier(itemsRankedLiveOld)))

  const contextParentEncoded = encodeItems(rootedIntersections(showContexts
    ? context
    : unrank(itemsRankedLiveOld)
  ))

  const itemParentChildren = showContexts ? (state.contextChildren[contextParentEncoded] || [])
    .filter(child =>
      (newOldItem || !equalItemRanked(child, { key: oldValue, rank: sigRank(rootedIntersections(itemsRankedLiveOld)) })) &&
      !equalItemRanked(child, { key: newValue, rank: sigRank(rootedIntersections(itemsRankedLiveOld)) })
    )
    // do not add floating item to context
   .concat(itemOld.memberOf.length > 0 ? {
      key: newValue,
      rank: sigRank(rootedIntersections(itemsRankedLiveOld)),
      lastUpdated: timestamp()
    } : [])
  : null

  // recursive function to change item within the context of all descendants
  // the inheritance is the list of additional ancestors built up in recursive calls that must be concatenated to itemsNew to get the proper context
  const recursiveUpdates = (itemsRanked, inheritance=[]) => {

    return getChildrenWithRank(itemsRanked, state.data, state.contextChildren).reduce((accum, child) => {
      const childItem = state.data[child.key]

      // remove and add the new context of the child
      const childNew = removeContext(childItem, unrank(itemsRanked), child.rank)
      childNew.memberOf.push({
        context: itemsNew.concat(showContexts ? key : []).concat(inheritance),
        rank: child.rank
      })

      // update local data so that we do not have to wait for firebase
      data[child.key] = childNew

      return Object.assign(accum,
        {
          [child.key]: {
            data: childNew,
            context: unrank(itemsRanked)
          }
        },
        recursiveUpdates(itemsRanked.concat(child), inheritance.concat(child.key))
      )
    }, {})
  }

  const recUpdatesResult = recursiveUpdates(itemsRankedLiveOld)
  const recUpdates = Object.keys(recUpdatesResult).reduce((accum, key) =>
    Object.assign({}, accum, {
      [key]: recUpdatesResult[key].data
    })
  , {})

  const contextChildrenRecursiveUpdates = Object.keys(recUpdatesResult).reduce((accum, key) => {
    const contextOldEncoded = encodeItems(recUpdatesResult[key].context)
    const contextNewEncoded = encodeItems(itemsNew.concat(recUpdatesResult[key].context.slice(itemsNew.length)))

    return Object.assign({}, accum, {
      [contextOldEncoded]: [],
      // merge collision thoughts
      // TODO: Recalculate ranks. Requires also changing data.
      [contextNewEncoded]: state.contextChildren[contextOldEncoded].concat(state.contextChildren[contextNewEncoded] || [])
    })
  }, {})

  const updates = Object.assign(
    {
      [oldValue]: newOldItem,
      [newValue]: itemNew
    },
    recUpdates
  )

  const contextChildrenUpdates = Object.assign(
    {
      [contextNewEncoded]: itemNewChildren
    },
    showContexts ? {
      [contextOldEncoded]: itemOldChildren,
      [contextParentEncoded]: itemParentChildren
    } : null,
    contextChildrenRecursiveUpdates
  )

  const newContextChildren = Object.assign({}, state.contextChildren, contextChildrenUpdates)

  // delete empty contextChildren
  for (let contextEncoded in contextChildrenUpdates) {
    const itemNewChildren = contextChildrenUpdates[contextEncoded]
    if (!itemNewChildren || itemNewChildren.length === 0) {
      delete newContextChildren[contextEncoded]
    }
  }

  const newContextViews = state.contextViews[encodeItems(itemsNew)] !== state.contextViews[encodeItems(itemsOld)]
    ? Object.assign({}, state.contextViews, {
      [encodeItems(itemsNew)]: state.contextViews[encodeItems(itemsOld)]
    })
    : state.contextViews

  setTimeout(() => {

    // localStorage
    localStorage['data-' + newValue] = JSON.stringify(itemNew)
    if (newOldItem) {
      localStorage['data-' + oldValue] = JSON.stringify(newOldItem)
    }
    else {
      delete localStorage['data-' + oldValue]
    }

    localStorage['contextChildren' + contextNewEncoded] = JSON.stringify(itemNewChildren)

    for (let contextEncoded in contextChildrenUpdates) {
      const itemNewChildren = contextChildrenUpdates[contextEncoded]
      if (itemNewChildren && itemNewChildren.length > 0) {
        localStorage['contextChildren' + contextEncoded] = JSON.stringify(itemNewChildren)
      }
      else {
        delete localStorage['contextChildren' + contextEncoded]
      }
    }

    for (let key in recUpdates) {
      localStorage['data-' + key] = JSON.stringify(recUpdates[key])
    }

    if (showContexts) {
      localStorage['data-' + key] = JSON.stringify(itemParentNew)
      localStorage['contextChildren' + contextOldEncoded] = JSON.stringify(itemOldChildren)
    }

    localStorage.lastUpdated = timestamp()

    // remote
    syncRemoteData(updates, contextChildrenUpdates)

    updateUrlHistory(cursorNew, { data: state.data, contextViews: newContextViews, replace: true })
  })

  return Object.assign(
    {
      // do not bump data nonce, otherwise editable will be re-rendered
      data,
      // update cursor so that the other contexts superscript and depth-bar will re-render
      // do not update cursorBeforeUpdate as that serves as the transcendental signifier to identify the item being edited
      cursor: cursorNew,
      expanded: expandItems(cursorNew, data, newContextChildren, newContextViews, contextChain),
      // copy context view to new value
      contextViews: newContextViews,
      contextChildren: newContextChildren
    },
    // canShowHelper('editIdentum', state) && itemOld.memberOf && itemOld.memberOf.length > 1 && newOldItem.memberOf.length > 0 && !equalArrays(context, newOldItem.memberOf[0].context) ? {
    //   showHelperIcon: 'editIdentum',
    //   helperData: {
    //     oldValue,
    //     newValue,
    //     context,
    //     rank,
    //     oldContext: newOldItem.memberOf[0].context
    //   }
    // } : {}
  )
}