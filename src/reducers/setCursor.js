import { store } from '../store'

// constants
import {
  TUTORIAL2_STEP_CONTEXT_VIEW_SELECT,
  TUTORIAL_CONTEXT,
  TUTORIAL_STEP_AUTOEXPAND,
  TUTORIAL_STEP_AUTOEXPAND_EXPAND,
} from '../constants'

// util
import {
  dataIntegrityCheck,
  equalPath,
  hashContext,
  headValue,
  isDescendant,
  pathToContext,
  updateUrlHistory,
} from '../util'

// selectors
import {
  chain,
  expandThoughts,
  getSetting,
  getThoughts,
  hashContextUrl,
  lastThoughtsFromContextChain,
} from '../selectors'

// action-creators
import loadResource from '../action-creators/loadResource'

// reducers
import settings from './settings'

// db
import { deleteCursor, updateCursor } from '../db'

// SIDE EFFECTS: updateUrlHistory, localStorage
// set both cursorBeforeEdit (the transcendental head) and cursor (the live value during editing)
// the other contexts superscript uses cursor when it is available
export default (state, {
  contextChain = [],
  cursorHistoryClear,
  cursorHistoryPop,
  editing,
  offset,
  replaceContextViews,
  thoughtsRanked,
  noteFocus = false
}) => {

  const thoughtsResolved = contextChain.length > 0
    ? chain(state, contextChain, thoughtsRanked, state.thoughtIndex)
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

    updateUrlHistory(state, thoughtsResolved, { contextViews: newContextViews })

    // persist the cursor so it can be restored after em is closed and reopened on the home page (see initialState)
    if (thoughtsResolved) {
      // persist the cursor to ensure the location does not change through refreshes in standalone PWA mode
      updateCursor(hashContextUrl({ ...state, contextViews: newContextViews }, pathToContext(thoughtsResolved)))
        .catch(err => {
          throw new Error(err)
        })
    }
    else {
      deleteCursor()
        .catch(err => {
          throw new Error(err)
        })
    }

    // load =src
    if (thoughtsResolved) {
      store.dispatch(loadResource(thoughtsResolved))
    }
  })

  const expanded = expandThoughts(
    { ...state, contextViews: newContextViews },
    thoughtsResolved || [],
    contextChain.length > 0
      ? contextChain.concat([thoughtsResolved.slice(lastThoughtsFromContextChain(state, contextChain).length)])
      : []
  )

  const tutorialChoice = +getSetting(state, 'Tutorial Choice') || 0
  const tutorialStep = +getSetting(state, 'Tutorial Step') || 1

  const oldCursor = state.cursor || []

  // logic to detect if any thought has collapsed for TUTORIAL_STEP_AUTOEXPAND
  // note: this logic doesn't take invisible meta thoughts, hidden thoughts and pinned thoughts into consideration
  // to-do: asbract tutorial logic away from setCursor and call only when tutorial is on
  const hasThoughtCollapsed = () => !expanded[hashContext(oldCursor)] &&
    (getThoughts(state, oldCursor).length > 0 ||
      (oldCursor.length > (thoughtsResolved || []).length && !isDescendant(thoughtsResolved || [], oldCursor))
    )

  const tutorialNext = (
    tutorialStep === TUTORIAL_STEP_AUTOEXPAND &&
    hasThoughtCollapsed()
  ) ||
    (tutorialStep === TUTORIAL_STEP_AUTOEXPAND_EXPAND &&
      Object.keys(expanded).length > 1) ||
    (tutorialStep === TUTORIAL2_STEP_CONTEXT_VIEW_SELECT &&
      thoughtsResolved &&
      thoughtsResolved.length >= 1 &&
      headValue(thoughtsResolved).toLowerCase().replace(/"/g, '') === TUTORIAL_CONTEXT[tutorialChoice].toLowerCase()
    )

  setTimeout(() => dataIntegrityCheck(thoughtsResolved), 100)

  // only change editing status and expanded but do not move the cursor if cursor has not changed
  return equalPath(thoughtsResolved, state.cursor) && state.contextViews === newContextViews
    ? {
      // sync cursor and cursorBeforeEdit
      // this is needed in particular for creating a new note, otherwise the cursor will disappear
      cursorBeforeEdit: state.cursor,
      editing: editing != null ? editing : state.editing,
      expanded,
      noteFocus
    }
    : {
      cursor: thoughtsResolved,
      cursorBeforeEdit: thoughtsResolved,
      cursorOffset: offset,
      codeView: false,
      cursorHistory: cursorHistoryClear ? [] :
      cursorHistoryPop ? state.cursorHistory.slice(0, state.cursorHistory.length - 1)
      : state.cursorHistory,
      contextViews: newContextViews,
      // dataNonce must be bumped so that <Subthoughts> are re-rendered
      // otherwise the cursor gets lost when changing focus from an edited thought
      dataNonce: state.dataNonce + 1,
      editing: editing != null ? editing : state.editing,
      expanded,
      noteFocus,
      ...tutorialNext
        ? settings({ ...state, cursor: thoughtsResolved }, {
          key: 'Tutorial Step',
          value: tutorialStep + 1
        })
        : null,
    }
}
