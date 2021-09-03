import { isTouch, isSafari } from '../browser'
import { HOME_TOKEN, TUTORIAL_STEP_START } from '../constants'
import { getSetting, hasChild, isContextViewActive } from '../selectors'
import { asyncFocus, parentOf, ellipsize, pathToContext, head } from '../util'
import { alert } from '../action-creators'
import { Thunk, Context, Path, SplitResult, State } from '../@types'
import { isMobile } from '../util/isMobile'
import { getAllChildrenAsThoughts } from '../selectors/getChildren'

/** Split editingValue by offset and check if splitted parts are duplicate with siblings. */
const isDuplicateOnSplit = (splitResult: SplitResult, context: Context | null, state: State) => {
  const { editingValue } = state
  if (!editingValue) return false
  const siblings = getAllChildrenAsThoughts(state, context || [HOME_TOKEN])
  return (
    splitResult.left === splitResult.right ||
    siblings.some(sibling => sibling.value === splitResult.left || sibling.value === splitResult.right)
  )
}

/**
 * Creates a new thought.
 *
 * @param offset - Cursor offset.
 * @param preventSplit - Set to true to prevent splitting thought.
 */
const newThought =
  ({
    at,
    insertBefore,
    insertNewSubthought,
    splitResult,
    preventSetCursor,
    preventSplit,
    value = '',
  }: {
    at?: Path
    insertBefore?: boolean
    insertNewSubthought?: boolean
    splitResult?: SplitResult | null
    preventSetCursor?: boolean
    preventSplit?: boolean
    value?: string
  }): Thunk =>
  (dispatch, getState) => {
    const state = getState()
    const { cursor, editingValue } = state
    const tutorial = getSetting(state, 'Tutorial') !== 'Off'
    const tutorialStep = +!getSetting(state, 'Tutorial Step')

    const path = at || cursor

    const thought = path && state.thoughts.contextIndex[head(path)]

    // cancel if tutorial has just started
    if (tutorial && tutorialStep === TUTORIAL_STEP_START) return

    // making sure the current focus in on the editable component to prevent splitting
    const isFocusOnEditable = isMobile() ? true : document.activeElement!.classList.contains('editable')

    // Determine if thought at path is uneditable
    const contextOfCursor = path && pathToContext(state, path)
    const uneditable = contextOfCursor && hasChild(state, contextOfCursor, '=uneditable')

    const showContexts = path && isContextViewActive(state, parentOf(pathToContext(state, path)))

    const context =
      path &&
      (showContexts && path.length > 2
        ? pathToContext(state, parentOf(parentOf(path)))
        : !showContexts && path.length > 1
        ? pathToContext(state, parentOf(path))
        : [HOME_TOKEN])
    // split the thought at the selection
    // do not split at the beginning of a line as the common case is to want to create a new thought after, and shift + Enter is so near
    // do not split with gesture, as Enter is avialable and separate in the context of mobile
    const split =
      !preventSplit &&
      path &&
      isFocusOnEditable &&
      !showContexts &&
      !value &&
      editingValue &&
      splitResult &&
      splitResult.left.length > 0 &&
      splitResult.right.length > 0 &&
      splitResult.left.length < editingValue?.length

    if ((!split || !uneditable) && isTouch && isSafari) {
      asyncFocus()
    }
    if (split) {
      if (isDuplicateOnSplit(splitResult!, context, state)) {
        dispatch(
          alert('Duplicate thoughts are not allowed within the same context.', {
            alertType: 'duplicateThoughts',
            clearTimeout: 2000,
          }),
        )
        return
      }
      dispatch(
        uneditable && path && thought
          ? { type: 'error', value: `"${ellipsize(thought?.value)}" is uneditable and cannot be split.` }
          : { type: 'splitThought', splitResult },
      )
      return
    }

    dispatch({
      type: 'newThought',
      at: path,
      insertBefore,
      insertNewSubthought,
      preventSetCursor,
      value,
    })
  }

export default newThought
