import _ from 'lodash'
import { HOME_PATH, HOME_TOKEN, TUTORIAL2_STEP_CONTEXT_VIEW_SELECT, TUTORIAL_CONTEXT, TUTORIAL_STEP_AUTOEXPAND, TUTORIAL_STEP_AUTOEXPAND_EXPAND } from '../constants'
import { chain, expandThoughts, getSetting, getAllChildren, simplifyPath } from '../selectors'
import { equalPath, equalThoughtRanked, hashContext, headValue, isDescendant, pathToContext } from '../util'
import { render, settings } from '../reducers'
import { State } from '../util/initialState'
import { Index, Path, SimplePath, TutorialChoice } from '../types'

/**
 * Sets the cursor on a thought.
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
}: {
  contextChain?: SimplePath[],
  cursorHistoryClear?: boolean,
  cursorHistoryPop?: boolean,
  editing?: boolean | null,
  noteFocus?: boolean,
  offset?: number | null,
  replaceContextViews?: Index<boolean>,
  path: Path | null,
}): State => {

  if (path && path.length > 1 && equalThoughtRanked(path[0], HOME_PATH[0])) {
    // log error instead of throwing since it can cause the pullQueue to enter an infinite loop
    console.error(new Error('setCursor: Invalid Path; Non-root Paths should omit ' + HOME_TOKEN))
    return state
  }

  const simplePath = path ? simplifyPath(state, path) : HOME_PATH
  const context = pathToContext(simplePath)
  const thoughtsResolved = path && contextChain.length > 0
    ? chain(state, contextChain, simplePath!)
    : path

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

  // TODO
  // load =src
  // setTimeout(() => {
  //   if (thoughtsResolved) {
  //     dispatch(loadResource(thoughtsResolved))
  //   }
  // })

  const expanded = expandThoughts({ ...state, contextViews: newContextViews }, thoughtsResolved)

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
    (getAllChildren(state, context).length > 0 ||
      (oldCursor.length > (thoughtsResolved || []).length && !isDescendant(pathToContext(thoughtsResolved || []), context))
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
      // set cursorOffset to null if editingValue is null
      // (prevents Editable from calling setSelection on click since we want the default cursor placement in that case)
      cursorOffset: offset ?? (state.editingValue !== null ? 0 : null),
      contextViews: newContextViews,
      editing: editing != null ? editing : state.editing,
      expanded,
      noteFocus,
    })

  return stateNew
}

export default _.curryRight(setCursor)
