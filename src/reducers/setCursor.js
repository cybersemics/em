import globals from '../globals.js'

// constants
import {
  TUTORIAL_CONTEXT,
  TUTORIAL_STEP_AUTOEXPAND,
  TUTORIAL_STEP_AUTOEXPAND_EXPAND,
  TUTORIAL2_STEP_CONTEXT_VIEW_SELECT,
} from '../constants.js'

// util
import {
  chain,
  encodeItems,
  encodeItemsUrl,
  equalItemsRanked,
  expandItems,
  lastItemsFromContextChain,
  sigKey,
  updateUrlHistory,
  unrank,
} from '../util.js'

// reducers
import { settings } from './settings.js'

// SIDE EFFECTS: updateUrlHistory, localStorage
// set both cursorBeforeEdit (the transcendental signifier) and cursor (the live value during editing)
// the other contexts superscript uses cursor when it is available
export const setCursor = (state, { itemsRanked, contextChain = [], cursorHistoryClear, cursorHistoryPop, replaceContextViews, editing }) => {

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
    for (const encoded in replaceContextViews) {
      newContextViews[encoded] = true
    }

    // remove
    for (const encoded in state.contextViews) {
      if (!(encoded in replaceContextViews)) {
        delete newContextViews[encoded]
      }
    }
  }

  clearTimeout(globals.newChildHelperTimeout)
  clearTimeout(globals.superscriptHelperTimeout)

  setTimeout(() => {

    updateUrlHistory(itemsResolved, { contextViews: newContextViews })

    // persist the cursor so it can be restored after em is closed and reopened on the home page (see initialState)
    if (itemsResolved) {
      localStorage.cursor = encodeItemsUrl(unrank(itemsResolved), { contextViews: newContextViews })
    }
    else {
      delete localStorage.cursor
    }
  })

  const expanded = itemsResolved ? expandItems(
      itemsResolved,
      state.data,
      state.contextChildren,
      newContextViews,
      contextChain.length > 0
        ? contextChain.concat([itemsResolved.slice(lastItemsFromContextChain(contextChain, state).length)])
        : []
    ) : {}

  const tutorialStep = state.settings.tutorialStep

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
    ...settings(state, {
      key: 'tutorialStep',
      value: tutorialStep + (
        (tutorialStep === TUTORIAL_STEP_AUTOEXPAND &&
          itemsResolved &&
          itemsResolved.length === 1 &&
          Object.keys(expanded).length === 1 &&
          !state.contextChildren[encodeItems(unrank(itemsResolved))]) ||
        (tutorialStep === TUTORIAL_STEP_AUTOEXPAND_EXPAND &&
          Object.keys(expanded).length > 1) ||
        (tutorialStep === TUTORIAL2_STEP_CONTEXT_VIEW_SELECT &&
          itemsResolved &&
          itemsResolved.length >= 1 &&
          sigKey(itemsResolved).toLowerCase().replace(/"/g, '') === TUTORIAL_CONTEXT[state.settings.tutorialChoice].toLowerCase())
        ? 1 : 0)
    })
  }
}
