import { ActionCreator, Context } from '../types'
import { isMobile, isSafari } from '../browser'
import { ROOT_TOKEN, TUTORIAL_STEP_START } from '../constants'
import { getSetting, getThoughts, hasChild, isContextViewActive } from '../selectors'

// util
import {
  asyncFocus,
  contextOf,
  ellipsize,
  headValue,
  pathToContext,
} from '../util'
import { State } from '../util/initialState'

/** Split editingValue by offset and check if splitted parts are duplicate with siblings. */
const isDuplicateOnSplit = (offset: number, context: Context | null, state: State) => {
  const { editingValue } = state
  const siblings = context && getThoughts(state, context)
  return siblings && editingValue && siblings.some(sibling => sibling.value === editingValue.substring(0, offset) || sibling.value === editingValue.substring(offset))
}

/**
 * Creates a new thought.
 *
 * @param offset - Cursor offset.
 * @param preventSplit - Set to true to prevent splitting thought.
 */
const newThought = ({ offset, preventSplit, value = '' }: { offset: number, preventSplit?: boolean, value: string }): ActionCreator => (dispatch, getState) => {
  const state = getState()
  const { cursor, editingValue } = state
  const tutorial = getSetting(state, 'Tutorial') !== 'Off'
  const tutorialStep = +!getSetting(state, 'Tutorial Step')

  // cancel if tutorial has just started
  if (tutorial && tutorialStep === TUTORIAL_STEP_START) return

  // making sure the current focus in on the editable component to prevent splitting
  const isFocusOnEditable = document.activeElement!.classList.contains('editable')

  // Determine if thought at cursor is uneditable
  const contextOfCursor = cursor && pathToContext(cursor)
  const uneditable = contextOfCursor && hasChild(state, contextOfCursor, '=uneditable')

  const showContexts = cursor && isContextViewActive(state, contextOf(pathToContext(cursor)))

  const context = cursor && (showContexts && cursor.length > 2 ? pathToContext(contextOf(contextOf(cursor)))
    : !showContexts && cursor.length > 1 ? pathToContext(contextOf(cursor))
    : [ROOT_TOKEN])
  // split the thought at the selection
  // do not split at the beginning of a line as the common case is to want to create a new thought after, and shift + Enter is so near
  // do not split with gesture, as Enter is avialable and separate in the context of mobile
  const split = !preventSplit && cursor && isFocusOnEditable && !showContexts && !value && offset > 0 && editingValue && offset < editingValue.length
  if ((!split || !uneditable) && isMobile && isSafari) {
    asyncFocus()
  }
  if (split) {
    if (isDuplicateOnSplit(offset, context, state)) {
      dispatch({ type: 'alert', value: 'Duplicate thoughts are not allowed within the same context.', alertType: 'duplicateThoughts' })
      setTimeout(() => dispatch({ type: 'alert', value: null, alertType: 'duplicateThoughts' }), 2000)
      return
    }
    dispatch(uneditable && cursor
      ? { type: 'error', value: `"${ellipsize(headValue(cursor))}" is uneditable and cannot be split.` }
      : { type: 'splitThought', offset })
    return
  }

  dispatch({ type: 'newThought', value })

}

export default newThought
