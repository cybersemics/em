/** Defines the redux reducer and exports a global store.
  NOTE: Exporting the store is not compatible with server-side rendering.
*/

import { createStore } from 'redux'
import { encode as firebaseEncode, decode as firebaseDecode } from 'firebase-encode'
import { clientId, isMobile } from './browser.js'
import globals from './globals.js'

// constants
import {
  EMPTY_TOKEN,
  FIREBASE_CONFIG,
  MAX_CURSOR_HISTORY,
  OFFLINE_TIMEOUT,
  RANKED_ROOT,
  RENDER_DELAY,
  ROOT_TOKEN,
  SCHEMA_CONTEXTCHILDREN,
  SCHEMA_LATEST,
  SCHEMA_ROOT,
  TUTORIAL_STEP_START,
  TUTORIAL_STEP_AUTOEXPAND,
  TUTORIAL_STEP_AUTOEXPAND_EXPAND,
  TUTORIAL_STEP_END,
} from './constants.js'

// util
import {
  addContext,
  canShowHelper,
  chain,
  decodeItemsUrl,
  equalItemRanked,
  equalItemsRanked,
  encodeItems,
  encodeItemsUrl,
  equalArrays,
  exists,
  expandItems,
  getChildrenWithRank,
  getNextRank,
  helperCleanup,
  intersections,
  isRoot,
  lastItemsFromContextChain,
  moveItem,
  notNull,
  removeContext,
  resetTranslateContentIntoView,
  restoreSelection,
  rootedIntersections,
  sigKey,
  signifier,
  sigRank,
  splitChain,
  timestamp,
  translateContentIntoView,
  unrank,
  unroot,
  updateUrlHistory,
  userAuthenticated
} from './util.js'

export const initialState = () => {

  const state = {

    /* status:
      'disconnected'   Yet to connect to firebase, but not in explicit offline mode.
      'connecting'     Connecting to firebase.
      'connected'      Connected to firebase, but not necessarily authenticated.
      'authenticated'  Connected and authenticated.
      'offline'        Disconnected and working in offline mode.
    */
    status: 'disconnected',
    focus: RANKED_ROOT,
    contextViews: {},
    data: {
      [ROOT_TOKEN]: {
        value: ROOT_TOKEN,
        memberOf: [],
        created: timestamp(),
        lastUpdated: timestamp()
      }
    },
    // store children indexed by the encoded context for O(1) lookup of children
    contextChildren: {
      [encodeItems([ROOT_TOKEN])]: []
    },
    lastUpdated: localStorage.lastUpdated,
    settings: {
      dark: JSON.parse(localStorage['settings-dark'] || 'false'),
      autologin: JSON.parse(localStorage['settings-autologin'] || 'false'),
      tutorialStep: globals.disableTutorial ? TUTORIAL_STEP_END : JSON.parse(localStorage['settings-tutorialStep'] || TUTORIAL_STEP_START),
    },
    // cheap trick to re-render when data has been updated
    dataNonce: 0,
    helpers: {},
    cursorHistory: [],
    schemaVersion: SCHEMA_LATEST
  }

  // initial data
  for (let key in localStorage) {
    if (key.startsWith('data-')) {
      const value = key.substring(5)
      state.data[value] = JSON.parse(localStorage[key])
    }
    else if (key.startsWith('contextChildren_')) {
      const value = key.substring('contextChildren'.length)
      state.contextChildren[value] = JSON.parse(localStorage[key])
    }
  }

  // if we land on the home page, restore the saved cursor
  // this is helpful for running em as a home screen app that refreshes from time to time
  const restoreCursor = window.location.pathname.length <= 1 && localStorage.cursor
  const { itemsRanked, contextViews } = decodeItemsUrl(restoreCursor ? localStorage.cursor : window.location.pathname, state.data)

  if (restoreCursor) {
    updateUrlHistory(itemsRanked, { data: state.data })
  }

  // set cursor to null instead of root
  state.cursor = isRoot(itemsRanked) ? null : itemsRanked
  state.cursorBeforeEdit = state.cursor
  state.contextViews = contextViews
  state.expanded = state.cursor ? expandItems(state.cursor, state.data, state.contextChildren, contextViews, splitChain(state.cursor, { state: { data: state.data, contextViews }})) : {}

  // initial helper states
  const helpers = ['welcome', 'shortcuts', 'home', 'newItem', 'newChild', 'newChildSuccess', 'autofocus', 'superscriptSuggestor', 'superscript', 'contextView', 'editIdentum', 'depthBar', 'feedback']
  for (let i = 0; i < helpers.length; i++) {
    state.helpers[helpers[i]] = {
      complete: globals.disableTutorial || JSON.parse(localStorage['helper-complete-' + helpers[i]] || 'false'),
      hideuntil: JSON.parse(localStorage['helper-hideuntil-' + helpers[i]] || '0')
    }
  }

  // welcome helper
  if (canShowHelper('welcome', state)) {
    state.showHelper = 'welcome'
  }

  return state
}


export const appReducer = (state = initialState(), action) => {
  // console.info('ACTION', action)
  return Object.assign({}, state, (({

    status: ({ value }) => ({
      status: value
    }),

    authenticate: ({ value, user, userRef }) => ({
      // autologin is set to true in separate 'settings' action to set localStorage
      // assume firebase is connected and return to connected state
      status: value ? 'authenticated' : 'connected',
      user,
      userRef
    }),

    // SIDE EFFECTS: localStorage, scroll
    // preserves some settings
    clear: () => {
      localStorage.clear()
      localStorage['settings-dark'] = state.settings.dark
      localStorage['settings-tutorialStep'] = TUTORIAL_STEP_END
      localStorage['helper-complete-welcome'] = true

      setTimeout(() => {
        window.scrollTo(0, 0)
        resetTranslateContentIntoView()
      })

      return Object.assign({}, initialState(), {
        'helper-complete-welcome': true,
        showHelper: null,
        // override welcome tutorial data
        data: {
          [ROOT_TOKEN]: {
            value: ROOT_TOKEN,
            memberOf: [],
            created: timestamp(),
            lastUpdated: timestamp()
          }
        },
        settings: {
          dark: state.settings.dark
        }
      })
    },

    // force re-render
    render: () => ({
      dataNonce: state.dataNonce + 1
    }),

    // updates data and contextChildren with any number of items
    data: ({ data, contextChildrenUpdates, forceRender }) => {

      const newData = data ? Object.assign({}, state.data, data) : state.data

      // delete null items
      if (data) {
        for (let key in data) {
          if (data[key] == null) {
            delete newData[key]
          }
        }
      }

      const newContextChildren = Object.assign({}, state.contextChildren, contextChildrenUpdates)

      // delete empty children
      for (let contextEncoded in contextChildrenUpdates) {
        if (!contextChildrenUpdates[contextEncoded] || contextChildrenUpdates[contextEncoded].length === 0) {
          delete newContextChildren[contextEncoded]
        }
      }

      return {
        // remove null items
        dataNonce: state.dataNonce + (forceRender ? 1 : 0),
        data: newData,
        lastUpdated: timestamp(),
        contextChildren: newContextChildren
      }
    },

    tutorialStep: ({ value }) =>
      settingsReducer({
        key: 'tutorialStep',
        value
      }, state),

    // SIDE EFFECTS: localStorage
    delete: ({ value, forceRender }) => {

      const data = Object.assign({}, state.data)
      const item = state.data[value]
      delete data[value]
      delete localStorage['data-' + value]
      localStorage.lastUpdated = timestamp()

      // delete value from all contexts
      const contextChildren = Object.assign({}, state.contextChildren)
      if (item && item.memberOf && item.memberOf.length > 0) {
        item.memberOf.forEach(parent => {
          if (!parent || !parent.context) {
            console.error(`Invariant Violation: parent of ${value} has no context: ${JSON.toString(parent)}`)
            return
          }
          const contextEncoded = encodeItems(parent.context)
          contextChildren[contextEncoded] = (contextChildren[contextEncoded] || [])
            .filter(child => child.key !== value)
          if (contextChildren[contextEncoded].length === 0) {
            delete contextChildren[contextEncoded]
          }
        })
      }

      return {
        data,
        contextChildren,
        lastUpdated: timestamp(),
        dataNonce: state.dataNonce + (forceRender ? 1 : 0)
      }
    },

    // SIDE EFFECTS: sync
    // addAsContext adds the given context to the new item
    newItemSubmit: ({ value, context, addAsContext, rank }) => {

      // create item if non-existent
      const item = Object.assign({}, value in state.data && state.data[value]
        ? state.data[value]
        : {
          value: value,
          memberOf: [],
          created: timestamp()
        }, notNull({
          lastUpdated: timestamp()
        })
      )

      // store children indexed by the encoded context for O(1) lookup of children
      const contextEncoded = encodeItems(addAsContext ? [value] : context)
      let contextChildrenUpdates = {}
      let newContextChildren = state.contextChildren

      if (context.length > 0) {
        const newContextChild = Object.assign({
          key: addAsContext ? signifier(context) : value,
          rank: addAsContext ? getNextRank([{ key: value, rank }], state.data, state.contextChildren): rank,
          created: timestamp(),
          lastUpdated: timestamp()
        })
        const itemChildren = (state.contextChildren[contextEncoded] || [])
          .filter(child => !equalItemRanked(child, newContextChild))
          .concat(newContextChild)
        contextChildrenUpdates = { [contextEncoded]: itemChildren }
        newContextChildren = Object.assign({}, state.contextChildren, contextChildrenUpdates)
      }

      // if adding as the context of an existing item
      let itemChildNew
      if (addAsContext) {
        const itemChildOld = state.data[signifier(context)]
        itemChildNew = Object.assign({}, itemChildOld, {
          memberOf: itemChildOld.memberOf.concat({
            context: [value],
            rank: getNextRank([{ key: value, rank }], state.data, state.contextChildren)
          }),
          created: itemChildOld.created,
          lastUpdated: timestamp()
        })

        setTimeout(() => {
          syncOne(itemChildNew)
        }, RENDER_DELAY)
      }
      else {
        if (!item.memberOf) {
          item.memberOf = []
        }
        // floating thought (no context)
        if (context.length > 0) {
          item.memberOf.push({
            context,
            rank
          })
        }
      }

      // get around requirement that reducers cannot dispatch actions
      setTimeout(() => {
        syncOne(item, contextChildrenUpdates)
      }, RENDER_DELAY)

      return {
        data: Object.assign({}, state.data, {
          [value]: item
        }, itemChildNew ? {
          [itemChildNew.value]: itemChildNew
        } : null),
        dataNonce: state.dataNonce + 1,
        contextChildren: newContextChildren
      }
    },

    // SIDE EFFECTS: updateUrlHistory, localStorage
    // set both cursorBeforeEdit (the transcendental signifier) and cursor (the live value during editing)
    // the other contexts superscript uses cursor when it is available
    setCursor: ({ itemsRanked, contextChain=[], cursorHistoryClear, cursorHistoryPop, replaceContextViews, editing }) => {

      const itemsResolved = contextChain.length > 0
        ? chain(contextChain, itemsRanked, state.data)
        : itemsRanked

      // sync replaceContextViews with state.contextViews
      // ignore items that are not in the path of replaceContextViews
      // shallow copy
      const newContextViews = replaceContextViews
        ? Object.assign({}, state.contextViews)
        : state.contextViews

      if (replaceContextViews) {

        // add
        for (let encoded in replaceContextViews) {
          newContextViews[encoded] = true
        }

        // remove
        for (let encoded in state.contextViews) {
          if (!(encoded in replaceContextViews)) {
            delete newContextViews[encoded]
          }
        }
      }

      clearTimeout(globals.newChildHelperTimeout)
      clearTimeout(globals.superscriptHelperTimeout)

      const item = itemsRanked ? state.data[sigKey(itemsRanked)] : null
      if (!item) {
        setTimeout(() => {

          translateContentIntoView(state.cursor)
          updateUrlHistory(itemsResolved, { contextViews: newContextViews })

          // persist the cursor so it can be restored after em is closed and reopened on the home page (see initialState)
          if (itemsResolved) {
            localStorage.cursor = encodeItemsUrl(unrank(itemsResolved), { contextViews: newContextViews })
          }
          else {
            delete localStorage.cursor
          }
        })
      }

      const expanded = itemsResolved ? expandItems(
          itemsResolved,
          state.data,
          state.contextChildren,
          newContextViews,
          contextChain.length > 0
            ? contextChain.concat([itemsResolved.slice(lastItemsFromContextChain(contextChain, state).length)])
            : []
        ) : {}


      // only change editing status but do not move the cursor if cursor has not changed
      return equalItemsRanked(itemsResolved, state.cursor) && state.contextViews === newContextViews
      ? {
        editing: editing != null ? editing : state.editing
      }
      : {
        // dataNonce must be bumped so that <Children> are re-rendered
        // otherwise the cursor gets lost when changing focus from an edited item
        expanded,
        dataNonce: state.dataNonce + 1,
        cursor: itemsResolved,
        cursorBeforeEdit: itemsResolved,
        codeView: false,
        cursorHistory: cursorHistoryClear ? [] :
          cursorHistoryPop ? state.cursorHistory.slice(0, state.cursorHistory.length - 1)
          : state.cursorHistory,
        contextViews: newContextViews,
        editing: editing != null ? editing : state.editing,
        ...settingsReducer({
          key: 'tutorialStep',
          value: state.settings.tutorialStep + (
            (state.settings.tutorialStep === TUTORIAL_STEP_AUTOEXPAND &&
              itemsResolved &&
              itemsResolved.length === 1 &&
              Object.keys(expanded).length === 1 &&
              !state.contextChildren[encodeItems(unrank(itemsResolved))]) ||
            (state.settings.tutorialStep === TUTORIAL_STEP_AUTOEXPAND_EXPAND &&
              Object.keys(expanded).length > 1)
            ? 1 : 0)
        }, state)
      }
    },

    cursorHistory: ({ cursor }) => {
      return {
        cursorHistory: state.cursorHistory
          // shift first entry if history has exceeded its maximum size
          .slice(state.cursorHistory.length >= MAX_CURSOR_HISTORY ? 1 : 0)
          .concat([cursor])
      }
    },

    // SIDE EFFECTS: syncRemoteData, localStorage, updateUrlHistory
    existingItemChange: ({ oldValue, newValue, context, showContexts, itemsRanked, rankInContext, contextChain }) => {

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
    },

    // SIDE EFFECTS: syncRemoteData, localStorage
    existingItemDelete: ({ itemsRanked, rank, showContexts }) => {

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
    },

    // side effect: sync
    existingItemMove: ({ oldItemsRanked, newItemsRanked }) => {

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

        if (itemChildrenOld.length > 0) {
          localStorage['contextChildren' + contextEncodedOld] = JSON.stringify(itemChildrenOld)
        }
        else {
          delete localStorage['contextChildren' + contextEncodedOld]
        }
        if (itemChildrenNew.length > 0) {
          localStorage['contextChildren' + contextNewEncoded] = JSON.stringify(itemChildrenNew)
        }
        else {
          delete localStorage['contextChildren' + contextNewEncoded]
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
    },

    // SIDE EFFECTS: localStorage, syncRemoteData
    codeChange: ({ itemsRanked, newValue }) => {

      const value = sigKey(itemsRanked)
      const oldItem = state.data[value]
      const newItem = Object.assign({}, oldItem, {
        code: newValue
      })

      state.data[value] = newItem

      setTimeout(() => {
        localStorage['data-' + value] = JSON.stringify(newItem)
        syncRemoteData({
          [value]: newItem
        }, {})
      })

      return {
        data: Object.assign({}, state.data)
      }
    },

    // SIDE EFFECTS: localStorage, syncRemote
    settings: settingsReducer,

    // SIDE EFFECTS: localStorage
    helperComplete: ({ id }) => {
      localStorage['helper-complete-' + id] = true
      return {
        showHelper: null,
        helpers: Object.assign({}, state.helpers, {
          [id]: Object.assign({}, state.helpers[id], {
            complete: true
          })
        })
      }
    },

    // SIDE EFFECTS: localStorage, restoreSelection
    helperRemindMeLater: ({ id, duration=0 }) => {

      if (state.cursor && (state.editing || !isMobile)) {
        setTimeout(() => {
          restoreSelection(state.cursor)
        }, 0)
      }

      const time = Date.now() + duration
      localStorage['helper-hideuntil-' + id] = time

      helperCleanup()

      return {
        showHelper: null,
        helpers: Object.assign({}, state.helpers, {
          [id]: Object.assign({}, state.helpers[id], {
            hideuntil: time
          })
        })
      }
    },

    expandContextItem: ({ itemsRanked }) => ({
      expandedContextItem: equalItemsRanked(state.expandedContextItem, itemsRanked)
        ? null
        : itemsRanked
    }),

    showHelperIcon: ({ id, data }) =>
      canShowHelper(id, state)
        ? {
          showHelperIcon: id,
          helperData: data
        }
        : {},

    showHelper: ({ id, data }) =>
      canShowHelper(id, state)
        ? {
          showHelper: id,
          showHelperIcon: null,
          helperData: data || state.helperData
        }
        : {},

    // track editing independently of cursor to allow navigation when keyboard is hidden
    editing: ({ value }) => ({
      editing: value
    }),

    // SIDE EFFECTS: updateUrlHistory
    toggleContextView: () => {

      if (!state.cursor) return

      // disable intrathought linking until add, edit, delete, and expansion can be implemented
      // const key = sigKey(state.cursor)
      // const subthoughts = getSubthoughts(key, 3, { data: state.data })
      // const subthoughtUnderSelection = findSubthoughtByIndex(subthoughts, window.getSelection().focusOffset)

      const items = /*subthoughtUnderSelection.contexts.length > 0 && subthoughtUnderSelection.text !== key
        ? [stripPunctuation(subthoughtUnderSelection.text)]
        : */unrank(state.cursor)

      const encoded = encodeItems(items)
      const contextViews = Object.assign({}, state.contextViews)

      if (encoded in state.contextViews) {
        delete contextViews[encoded]
      }
      else {
        Object.assign(contextViews, {
          [encoded]: true
        })
      }

      updateUrlHistory(state.cursor, { data: state.data, contextViews })

      return {
        contextViews
      }
    },

    toggleCodeView: ({ value }) => ({
      codeView: equalItemsRanked(state.cursor, state.codeView) || value === false ? null : state.cursor
    }),

    search: ({ value }) => ({
      search: value
    }),

    cursorBeforeSearch: ({ value }) => ({
      cursorBeforeSearch: value
    }),

    dragInProgress: ({ value }) => ({
      dragInProgress: value
    }),

    selectionChange: ({ focusOffset }) => ({
      focusOffset
    }),

    searchLimit: ({ value }) => ({
      searchLimit: value
    })

  })[action.type] || (() => state))(action, state))
}

// SIDE EFFECTS: localStorage, syncRemote
const settingsReducer = ({ key, value, localOnly }, state) => {
  localStorage['settings-' + key] = value

  if (!localOnly) {
    setTimeout(() => {
      syncRemote({ ['settings/' + key]: value })
    })
  }

  return {
    settings: Object.assign({}, state.settings, { [key]: value })
  }
}

/** Saves data to state, localStorage, and Firebase. */
// assume timestamp has already been updated on dataUpdates
export const sync = (dataUpdates={}, contextChildrenUpdates={}, { localOnly, forceRender, updates, callback } = {}) => {

  const lastUpdated = timestamp()
  const { data } = store.getState()

  // state
  store.dispatch({ type: 'data', data: dataUpdates, contextChildrenUpdates, forceRender })

  // localStorage
  for (let key in dataUpdates) {
    if (dataUpdates[key]) {
      localStorage['data-' + key] = JSON.stringify(dataUpdates[key])
    }
    else {
      delete localStorage['data-' + key]
    }
    localStorage.lastUpdated = lastUpdated
  }

  for (let contextEncoded in contextChildrenUpdates) {
    const children = contextChildrenUpdates[contextEncoded]
      .filter(child => !data[child.key] && !dataUpdates[child.key])
    if (children.length > 0) {
      localStorage['contextChildren' + contextEncoded] = JSON.stringify(children)
    }
  }

  // firebase
  if (!localOnly) {
    syncRemoteData(dataUpdates, contextChildrenUpdates, updates, callback)
  }
  else {
    // do not let callback outrace re-render
    if (callback) {
      setTimeout(callback, RENDER_DELAY)
    }
  }
}


/** Shortcut for sync with single item. */
export const syncOne = (item, contextChildrenUpdates={}, options) => {
  sync({
    [item.value]: item
  }, contextChildrenUpdates, options)
}

/** Adds remote updates to a local queue so they can be resumed after a disconnect. */
// invokes callback asynchronously whether online or not in order to not outrace re-render
export const syncRemote = (updates = {}, callback) => {
  const state = store.getState()

  // add updates to queue appending clientId and timestamp
  const queue = Object.assign(
    JSON.parse(localStorage.queue || '{}'),
    // encode keys for firebase
    Object.keys(updates).length > 0 ? Object.assign(updates, {
      lastClientId: clientId,
      lastUpdated: timestamp()
    }) : {}
  )

  localStorage.queue = JSON.stringify(queue)

  // if authenticated, execute all updates
  // otherwise, queue them up
  if (state.status === 'authenticated' && Object.keys(queue).length > 0) {
    state.userRef.update(queue, (...args) => {
      delete localStorage.queue
      if (callback) {
        callback(...args)
      }
    })
  }
  else if (callback) {
    setTimeout(callback, RENDER_DELAY)
  }
}

/** alias for syncing data updates only */
export const syncRemoteData = (dataUpdates = {}, contextChildrenUpdates = {}, updates = {}, callback) => {
  // prepend data/ and encode key
  const prependedUpdates = Object.keys(dataUpdates).reduce((accum, key) =>
    Object.assign({}, accum, {
      ['data/' + (key === '' ? EMPTY_TOKEN : firebaseEncode(key))]: dataUpdates[key]
    }),
    {}
  )
  const prependedContextChildrenUpdates = Object.keys(contextChildrenUpdates).reduce((accum, contextEncoded) =>
    Object.assign({}, accum, {
      ['contextChildren/' + (contextEncoded === '' ? EMPTY_TOKEN : firebaseEncode(contextEncoded))]: contextChildrenUpdates[contextEncoded]
    }),
    {}
  )
  return syncRemote(Object.assign({}, updates, prependedUpdates, prependedContextChildrenUpdates), callback)
}

/** Save all firebase data to state and localStorage. */
export const fetch = value => {

  const state = store.getState()
  const lastUpdated = value.lastUpdated
  const settings = value.settings || {}
  const schemaVersion = value.schemaVersion || 0 // convert to integer to allow numerical comparison

  // settings
  // avoid unnecessary actions if values are identical
  if (settings.dark !== state.settings.dark) {
    store.dispatch({
      type: 'settings',
      key: 'dark',
      value: settings.dark || false,
      localOnly: true
    })
  }

  if (settings.tutorialStep !== state.settings.tutorialStep) {
    store.dispatch({
      type: 'settings',
      key: 'tutorialStep',
      value: settings.tutorialStep || TUTORIAL_STEP_START,
      localOnly: true
    })
  }

  // when logging in, we assume the user has already seen the tutorial
  // cancel and delete the tutorial if it is already running
  if (settings.tutorialStep < TUTORIAL_STEP_END) {
    store.dispatch({ type: 'tutorialStep', value: TUTORIAL_STEP_END })
  }

  const migrateRootUpdates = {}

  // data
  // keyRaw is firebase encoded
  const dataUpdates = Object.keys(value.data).reduce((accum, keyRaw) => {

    const key = keyRaw === EMPTY_TOKEN ? ''
      : keyRaw === 'root' && schemaVersion < SCHEMA_ROOT ? ROOT_TOKEN
      : firebaseDecode(keyRaw)
    const item = value.data[keyRaw]

    // migrate memberOf 'root' to ROOT_TOKEN
    if (schemaVersion < SCHEMA_ROOT) {
      let migratedItem = false
      item.memberOf = (item.memberOf || []).map(parent => {
        const migrateParent = parent.context && parent.context[0] === 'root'
        if (migrateParent) {
          migratedItem = true
        }
        return migrateParent ? Object.assign({}, parent, {
          context: [ROOT_TOKEN].concat(parent.context.slice(1))
        }) : parent
      })

      if (migratedItem) {
        migrateRootUpdates[item.value] = item
      }
    }

    const oldItem = state.data[key]
    const updated = item && (!oldItem || item.lastUpdated > oldItem.lastUpdated)

    if (updated) {
      // do not force render here, but after all values have been added
      localStorage['data-' + key] = JSON.stringify(item)
    }

    return updated ? Object.assign({}, accum, {
      [key]: item
    }) : accum
  }, {})

  // delete local data that no longer exists in firebase
  // only if remote was updated more recently than local since it is O(n)
  if (state.lastUpdated <= lastUpdated) {
    for (let key in state.data) {

      const keyRaw = key === '' ? EMPTY_TOKEN : firebaseEncode(key)
      if (!(keyRaw in value.data)) {
        // do not force render here, but after all values have been deleted
        store.dispatch({ type: 'delete', value: key })
      }
    }
  }

  // migrate from version without contextChildren
  if (schemaVersion < SCHEMA_CONTEXTCHILDREN) {
    // after data dispatch
    setTimeout(() => {
      console.info('Migrating contextChildren...')

      // keyRaw is firebase encoded
      const contextChildrenUpdates = Object.keys(value.data).reduce((accum, keyRaw) => {

        const key = keyRaw === EMPTY_TOKEN ? '' : firebaseDecode(keyRaw)
        const item = value.data[keyRaw]

        return Object.assign({}, accum, (item.memberOf || []).reduce((parentAccum, parent) => {

          if (!parent || !parent.context) return parentAccum
          const contextEncoded = encodeItems(parent.context)

          return Object.assign({}, parentAccum, {
            [contextEncoded]: (parentAccum[contextEncoded] || accum[contextEncoded] || [])
              .concat({
                key,
                rank: parent.rank,
                lastUpdated: item.lastUpdated
              })
          })
        }, {}))
      }, {})

      console.info('Syncing data...')

      sync({}, contextChildrenUpdates, { updates: { schemaVersion: SCHEMA_CONTEXTCHILDREN }, forceRender: true, callback: () => {
        console.info('Done')
      }})

    })
  }
  else {
    // contextEncodedRaw is firebase encoded
    const contextChildrenUpdates = Object.keys(value.contextChildren || {}).reduce((accum, contextEncodedRaw) => {

      const itemChildren = value.contextChildren[contextEncodedRaw]
      const contextEncoded = contextEncodedRaw === EMPTY_TOKEN ? ''
        : contextEncodedRaw === encodeItems(['root']) && !value.data[ROOT_TOKEN] ? encodeItems([ROOT_TOKEN])
        : firebaseDecode(contextEncodedRaw)

      // const oldChildren = state.contextChildren[contextEncoded]
      // if (itemChildren && (!oldChildren || itemChildren.lastUpdated > oldChildren.lastUpdated)) {
      if (itemChildren && itemChildren.length > 0) {
        // do not force render here, but after all values have been added
        localStorage['contextChildren' + contextEncoded] = JSON.stringify(itemChildren)
      }

      const itemChildrenOld = state.contextChildren[contextEncoded] || []

      // technically itemChildren is a disparate list of ranked item objects (as opposed to an intersection representing a single context), but equalItemsRanked works
      return Object.assign({}, accum, itemChildren && itemChildren.length > 0 && !equalItemsRanked(itemChildren, itemChildrenOld) ? {
        [contextEncoded]: itemChildren
      } : null)
    }, {})

    // delete local contextChildren that no longer exists in firebase
    // only if remote was updated more recently than local since it is O(n)
    if (state.lastUpdated <= lastUpdated) {
      for (let contextEncoded in state.contextChildren) {

        if (!(firebaseEncode(contextEncoded || EMPTY_TOKEN) in (value.contextChildren || {}))) {
          contextChildrenUpdates[contextEncoded] = null
        }
      }
    }

    // TODO: Re-render all thoughts except the thought being edited
    store.dispatch({ type: 'data', data: dataUpdates, contextChildrenUpdates, forceRender: !window.getSelection().focusNode })
  }

  // sync migrated root with firebase
  if (schemaVersion < SCHEMA_ROOT) {

    setTimeout(() => {

      const migrateRootContextUpdates = {
        [encodeItems(['root'])]: null,
        [encodeItems([ROOT_TOKEN])]: state.contextChildren[encodeItems([ROOT_TOKEN])],
      }

      console.info('Migrating "root"...', migrateRootUpdates, migrateRootContextUpdates)

      migrateRootUpdates.root = null
      migrateRootUpdates[ROOT_TOKEN] = state.data[ROOT_TOKEN]
      syncRemoteData(migrateRootUpdates, migrateRootContextUpdates, { schemaVersion: SCHEMA_ROOT }, () => {
        console.info('Done')
      })

      // re-render after everything has been updated
      // only if there is no cursor, otherwise it interferes with editing
      if (!state.cursor) {
        store.dispatch({ type: 'render' })
      }
    })
  }
}

export const initFirebase = () => {
  if (window.firebase) {
    const firebase = window.firebase
    firebase.initializeApp(FIREBASE_CONFIG)

    firebase.auth().onAuthStateChanged(user => {
      if (user) {
        userAuthenticated(user)
      }
      else {
        store.dispatch({ type: 'authenticate', value: false })
      }
    })

    const connectedRef = firebase.database().ref(".info/connected")
    connectedRef.on('value', snapshot => {
      const connected = snapshot.val()
      const status = store.getState().status

      // either connect with authenticated user or go to connected state until they login
      if (connected) {

        // once connected, disable offline mode timer
        window.clearTimeout(globals.offlineTimer)

        if (firebase.auth().currentUser) {
          userAuthenticated(firebase.auth().currentUser)
          syncRemoteData() // sync any items in the queue
        }
        else {
          store.dispatch({ type: 'status', value: 'connected' })
        }
      }

      // enter offline mode
      else if (status === 'authenticated') {
        store.dispatch({ type: 'status', value: 'offline' })
      }
    })
  }

  globals.offlineTimer = window.setTimeout(() => {
    store.dispatch({ type: 'status', value: 'offline' })
  }, OFFLINE_TIMEOUT)
}

export const store = createStore(
  appReducer,
  window.__REDUX_DEVTOOLS_EXTENSION__ && window.__REDUX_DEVTOOLS_EXTENSION__()
)
