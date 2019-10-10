import globals from '../globals.js'

import {
  chain,
  equalItemsRanked,
  encodeItemsUrl,
  expandItems,
  lastItemsFromContextChain,
  sigKey,
  translateContentIntoView,
  unrank,
  updateUrlHistory
} from '../util.js'

export const setCursor = (state) => ({ itemsRanked, contextChain=[], cursorHistoryClear, cursorHistoryPop, replaceContextViews, editing }) => {

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

  // do not update tutorial during inline tutorial
  const item = itemsRanked ? state.data[sigKey(itemsRanked)] : null
  if (!item || !item.tutorial) {
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

  // only change editing status but do not move the cursor if cursor has not changed
  return equalItemsRanked(itemsResolved, state.cursor) && state.contextViews === newContextViews
  ? {
    editing: editing != null ? editing : state.editing
  }
  : {
    // dataNonce must be bumped so that <Children> are re-rendered
    // otherwise the cursor gets lost when changing focus from an edited item
    expanded: itemsResolved ? expandItems(
      itemsResolved,
      state.data,
      state.contextChildren,
      newContextViews,
      contextChain.length > 0
        ? contextChain.concat([itemsResolved.slice(lastItemsFromContextChain(contextChain, state).length)])
        : []
    ) : {},
    dataNonce: state.dataNonce + 1,
    cursor: itemsResolved,
    cursorBeforeEdit: itemsResolved,
    codeView: false,
    cursorHistory: cursorHistoryClear ? [] :
      cursorHistoryPop ? state.cursorHistory.slice(0, state.cursorHistory.length - 1)
      : state.cursorHistory,
    contextViews: newContextViews,
    editing: editing != null ? editing : state.editing
  }
}