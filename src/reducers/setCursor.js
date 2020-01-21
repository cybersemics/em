import * as localForage from 'localforage'

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
  dataIntegrityCheck,
  equalPath,
  expandThoughts,
  hashContext,
  hashContextUrl,
  headValue,
  lastThoughtsFromContextChain,
  pathToContext,
  updateUrlHistory,
} from '../util.js'

// reducers
import settings from './settings.js'

// SIDE EFFECTS: updateUrlHistory, localStorage
// set both cursorBeforeEdit (the transcendental head) and cursor (the live value during editing)
// the other contexts superscript uses cursor when it is available
export default (state, { thoughtsRanked, contextChain = [], cursorHistoryClear, cursorHistoryPop, replaceContextViews, editing }) => {

  const thoughtsResolved = contextChain.length > 0
    ? chain(contextChain, thoughtsRanked, state.thoughtIndex)
    : thoughtsRanked

  // sync replaceContextViews with state.contextViews
  // ignore thoughts that are not in the path of replaceContextViews
  // shallow copy
  const newContextViews = replaceContextViews
    ? Object.assign({}, state.contextViews)
    : state.contextViews

  if (replaceContextViews) {

    // add
    Object.keys(replaceContextViews).forEach(encoded => {
      newContextViews[encoded] = true
    })

    // remove
    Object.keys(state.contextViews).forEach(encoded => {
      if (!(encoded in replaceContextViews)) {
        delete newContextViews[encoded] // eslint-disable-line fp/no-delete
      }
    })
  }

  setTimeout(() => {

    updateUrlHistory(thoughtsResolved, { contextViews: newContextViews })

    // persist the cursor so it can be restored after em is closed and reopened on the home page (see initialState)
    if (thoughtsResolved) {
      // persist the cursor to ensure the location does not change through refreshes in standalone PWA mode
      localForage.setItem('cursor', hashContextUrl(pathToContext(thoughtsResolved), { contextViews: newContextViews }))
        .catch(err => {
          throw new Error(err)
        })
    }
    else {
      localForage.removeItem('cursor').catch(err => {
        throw new Error(err)
      })
    }
  })

  const expanded = thoughtsResolved ? expandThoughts(
      thoughtsResolved,
      state.thoughtIndex,
      state.contextIndex,
      newContextViews,
      contextChain.length > 0
        ? contextChain.concat([thoughtsResolved.slice(lastThoughtsFromContextChain(contextChain, state).length)])
        : []
    ) : {}

  const tutorialStep = state.settings.tutorialStep

  setTimeout(() => dataIntegrityCheck(thoughtsResolved), 100)

  // only change editing status but do not move the cursor if cursor has not changed
  return equalPath(thoughtsResolved, state.cursor) && state.contextViews === newContextViews
  ? {
    editing: editing != null ? editing : state.editing,
    expanded
  }
  : {
    // dataNonce must be bumped so that <Subthoughts> are re-rendered
    // otherwise the cursor gets lost when changing focus from an edited thought
    expanded,
    dataNonce: state.dataNonce + 1,
    cursor: thoughtsResolved,
    cursorBeforeEdit: thoughtsResolved,
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
          thoughtsResolved &&
          thoughtsResolved.length === 1 &&
          Object.keys(expanded).length === 1 &&
          !state.contextIndex[hashContext(thoughtsResolved)]) ||
        (tutorialStep === TUTORIAL_STEP_AUTOEXPAND_EXPAND &&
          Object.keys(expanded).length > 1) ||
        (tutorialStep === TUTORIAL2_STEP_CONTEXT_VIEW_SELECT &&
          thoughtsResolved &&
          thoughtsResolved.length >= 1 &&
          headValue(thoughtsResolved).toLowerCase().replace(/"/g, '') === TUTORIAL_CONTEXT[state.settings.tutorialChoice].toLowerCase())
        ? 1 : 0)
    })
  }
}
