import { isTouch, isSafari } from '../browser'
import { HOME_TOKEN, TUTORIAL_STEP_START } from '../constants'
import { getSetting, getAllChildren, hasChild, isContextViewActive } from '../selectors'
import { parentOf, ellipsize, headValue, pathToContext } from '../util'
import { alert } from '../action-creators'
import asyncFocus from '../device/asyncFocus'
import { Thunk, Context, Path, SplitResult, State } from '../@types'
import * as selection from '../device/selection'

/** Split editingValue by offset and check if splitted parts are duplicate with siblings. */
const isDuplicateOnSplit = (splitResult: SplitResult, context: Context | null, state: State) => {
  const { editingValue } = state
  if (!editingValue) return false
  const siblings = getAllChildren(state, context || [HOME_TOKEN])
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

    // cancel if tutorial has just started
    if (tutorial && tutorialStep === TUTORIAL_STEP_START) return

    // Determine if thought at path is uneditable
    const contextOfCursor = path && pathToContext(path)
    const uneditable = contextOfCursor && hasChild(state, contextOfCursor, '=uneditable')

    const showContexts = path && isContextViewActive(state, parentOf(pathToContext(path)))

    const context =
      path &&
      (showContexts && path.length > 2
        ? pathToContext(parentOf(parentOf(path)))
        : !showContexts && path.length > 1
        ? pathToContext(parentOf(path))
        : [HOME_TOKEN])
    // split the thought at the selection
    // do not split at the beginning of a line as the common case is to want to create a new thought after, and shift + Enter is so near
    // do not split with gesture, as Enter is avialable and separate in the context of mobile
    const split =
      !preventSplit &&
      path &&
      selection.isThought() &&
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
            clearDelay: 2000,
          }),
        )
        return
      }
      dispatch(
        uneditable && path
          ? { type: 'error', value: `"${ellipsize(headValue(path))}" is uneditable and cannot be split.` }
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
