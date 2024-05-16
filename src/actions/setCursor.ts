import _ from 'lodash'
import Index from '../@types/IndexType'
import Path from '../@types/Path'
import SimplePath from '../@types/SimplePath'
import State from '../@types/State'
import Thunk from '../@types/Thunk'
import TutorialChoice from '../@types/TutorialChoice'
import setTutorialStep from '../actions/tutorialStep'
import {
  HOME_PATH,
  HOME_TOKEN,
  TUTORIAL2_STEP_CONTEXT_VIEW_SELECT,
  TUTORIAL_CONTEXT,
  TUTORIAL_STEP_AUTOEXPAND_EXPAND,
} from '../constants'
import globals from '../globals'
import chain from '../selectors/chain'
import expandThoughts from '../selectors/expandThoughts'
import getSetting from '../selectors/getSetting'
import getThoughtById from '../selectors/getThoughtById'
import simplifyPath from '../selectors/simplifyPath'
import editingValueStore from '../stores/editingValue'
import equalPath from '../util/equalPath'
import head from '../util/head'
import pathToContext from '../util/pathToContext'

/**
 * Sets the cursor on a thought.
 */
const setCursor = (
  state: State,
  {
    contextChain = [],
    cursorHistoryClear,
    cursorHistoryPop,
    editing,
    noteFocus = false,
    offset,
    path,
    replaceContextViews,
  }: {
    contextChain?: SimplePath[]
    cursorHistoryClear?: boolean
    cursorHistoryPop?: boolean
    editing?: boolean | null
    noteFocus?: boolean
    offset?: number | null
    path: Path | null
    replaceContextViews?: Index<boolean>
  },
): State => {
  if (path && path.length > 1 && path[0] === HOME_TOKEN) {
    // log error instead of throwing since it can cause the pullQueue to enter an infinite loop
    console.error(
      new Error(
        `setCursor: Invalid Path ${JSON.stringify(
          pathToContext(state, path),
        )}. Non-root Paths should omit ${HOME_TOKEN}`,
      ),
    )
    return state
  } else if (path && path.length === 0) {
    // log error instead of throwing since it can cause the pullQueue to enter an infinite loop
    console.error(new Error(`[] is not a valid path. Use [${HOME_TOKEN}].`))
    return state
  }

  const simplePath = path ? simplifyPath(state, path) : HOME_PATH
  const thoughtsResolved = path && contextChain.length > 0 ? chain(state, contextChain, simplePath!) : path
  const thought = thoughtsResolved && getThoughtById(state, head(thoughtsResolved))

  // sync replaceContextViews with state.contextViews
  // ignore thoughts that are not in the path of replaceContextViews
  // shallow copy
  const newContextViews = replaceContextViews ? Object.assign({}, state.contextViews) : state.contextViews

  if (replaceContextViews) {
    // add
    Object.keys(replaceContextViews).forEach(encoded => {
      newContextViews[encoded] = true
    })

    // remove
    Object.keys(state.contextViews).forEach(encoded => {
      if (!(encoded in replaceContextViews)) {
        delete newContextViews[encoded]
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

  // If expansion is suppressed, use existing expansion.
  // setCursor will be re-triggered after expansion is unsuppressed.
  const expanded = globals.suppressExpansion
    ? state.expanded
    : expandThoughts({ ...state, contextViews: newContextViews }, thoughtsResolved)

  const tutorialChoice = +(getSetting(state, 'Tutorial Choice') || 0) as TutorialChoice
  const tutorialStep = +(getSetting(state, 'Tutorial Step') || 1)

  const tutorialNext =
    (tutorialStep === TUTORIAL_STEP_AUTOEXPAND_EXPAND && Object.keys(expanded).length > 1) ||
    (tutorialStep === TUTORIAL2_STEP_CONTEXT_VIEW_SELECT &&
      thoughtsResolved &&
      thoughtsResolved.length >= 1 &&
      thought?.value!.toLowerCase().replace(/"/g, '') === TUTORIAL_CONTEXT[tutorialChoice].toLowerCase())

  // non-pure
  const updatedOffset = offset ?? (editingValueStore.getState() !== null ? 0 : null)

  // only change editing status and expanded but do not move the cursor if cursor has not changed
  const stateNew = {
    ...state,
    ...(!equalPath(thoughtsResolved, state.cursor) || state.contextViews !== newContextViews
      ? {
          ...(tutorialNext
            ? setTutorialStep(
                { ...state, cursor: thoughtsResolved },
                {
                  value: tutorialStep + 1,
                },
              )
            : null),
          cursor: thoughtsResolved,
          cursorHistory: cursorHistoryClear
            ? []
            : cursorHistoryPop
              ? state.cursorHistory.slice(0, -1)
              : state.cursorHistory,
          // set cursorOffset to null if editingValue is null
          // (prevents Editable from calling selection.set on click since we want the default cursor placement in that case)
          contextViews: newContextViews,
        }
      : null),
    // this is needed in particular for creating a new note, otherwise the cursor will disappear
    editing: editing != null ? editing : state.editing,
    // reset cursorCleared on navigate
    cursorCleared: false,
    cursorOffset: updatedOffset,
    expanded,
    noteFocus,
    cursorInitialized: true,
    ...(!thoughtsResolved ? { showColorPicker: false } : null),
  }

  return stateNew
}

/** Action-creator for setCursor. */
export const setCursorActionCreator =
  (payload: Parameters<typeof setCursor>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'setCursor', ...payload })

export default _.curryRight(setCursor)
