import _ from 'lodash'
import { store } from '../store'
import { dataIntegrityCheck, loadResource } from '../action-creators'
import { TUTORIAL2_STEP_CONTEXT_VIEW_SELECT, TUTORIAL_CONTEXT, TUTORIAL_STEP_AUTOEXPAND, TUTORIAL_STEP_AUTOEXPAND_EXPAND } from '../constants'
import { chain, expandThoughts, getSetting, getAllChildren, simplifyPath } from '../selectors'
import { clearSelection, equalPath, hashContext, headValue, isDescendant, isDivider, pathToContext } from '../util'
import { render, settings } from '../reducers'
import { State } from '../util/initialState'
import { Index, Path, SimplePath, TutorialChoice } from '../types'

interface Payload {
  contextChain?: SimplePath[],
  cursorHistoryClear?: boolean,
  cursorHistoryPop?: boolean,
  editing?: boolean | null,
  noteFocus?: boolean,
  offset?: number,
  replaceContextViews?: Index<boolean>,
  path: Path | null,
}

/**
 * Sets the cursor on a thought.
 * Side Effects: clearSelection.
 */
const setCursor = (state: State, {
  contextChain = [],
  cursorHistoryClear,
  cursorHistoryPop,
  editing,
  offset,
  replaceContextViews,
  path,
  noteFocus = false
}: Payload): State => {

  const thoughtsResolved = path && contextChain.length > 0
    ? chain(state, contextChain, simplifyPath(state, path))
    : path

  // SIDE EFFECT
  // clear the browser selection if a divider is being selected
  if (thoughtsResolved && isDivider(headValue(thoughtsResolved))) {
    clearSelection()
  }

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

  // load =src
  setTimeout(() => {
    if (thoughtsResolved) {
      store.dispatch(loadResource(thoughtsResolved))
    }
  })

  const expanded = expandThoughts({ ...state, contextViews: newContextViews }, thoughtsResolved || [])

  const tutorialChoice = +(getSetting(state, 'Tutorial Choice') || 0) as TutorialChoice
  const tutorialStep = +(getSetting(state, 'Tutorial Step') || 1)

  const oldCursor = state.cursor || []

  /**
   * Detects if any thought has collapsed for TUTORIAL_STEP_AUTOEXPAND.
   * This logic doesn't take invisible meta thoughts, hidden thoughts and pinned thoughts into consideration.
   *
   * @todo Abstract tutorial logic away from setCursor and call only when tutorial is on.
   */
  const hasThoughtCollapsed = () => !expanded[hashContext(pathToContext(oldCursor))] &&
    (getAllChildren(state, pathToContext(oldCursor)).length > 0 ||
      (oldCursor.length > (thoughtsResolved || []).length && !isDescendant(pathToContext(thoughtsResolved || []), pathToContext(oldCursor)))
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

  setTimeout(() => store.dispatch(dataIntegrityCheck(thoughtsResolved!)), 100)

  // only change editing status and expanded but do not move the cursor if cursor has not changed
  const stateNew = equalPath(thoughtsResolved, state.cursor) && state.contextViews === newContextViews
    // must re-render even if cursor has not moved
    // e.g. blurring due to closing the keyboard
    // otherwise something goes wrong and the cursor or subthoughts may disappear
    // See https://github.com/cybersemics/em/issues/674.
    // However this does create a lot of extra re-renders.
    ? render({
      ...state,
      // this is needed in particular for creating a new note, otherwise the cursor will disappear
      editing: editing != null ? editing : state.editing,
      expanded,
      noteFocus,
    })
    : render({
      ...state,
      ...offset != null ? { cursorOffset: offset } : null,
      // re-render so that <Subthoughts> are re-rendered
      // otherwise the cursor gets lost when changing focus from an edited thought
      ...tutorialNext
        ? settings({ ...state, cursor: thoughtsResolved }, {
          key: 'Tutorial Step',
          value: (tutorialStep + 1).toString()
        })
        : null,
      cursor: thoughtsResolved,
      cursorHistory: cursorHistoryClear ? [] :
      cursorHistoryPop ? state.cursorHistory.slice(0, -1)
      : state.cursorHistory,
      contextViews: newContextViews,
      editing: editing != null ? editing : state.editing,
      expanded,
      noteFocus,
    })

  return stateNew
}

export default _.curryRight(setCursor)
