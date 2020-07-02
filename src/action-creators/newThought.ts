import { ActionCreator } from '../types'
import { isMobile, isSafari } from '../browser'
import { TUTORIAL_STEP_START } from '../constants'
import { getSetting, hasChild, isContextViewActive } from '../selectors'

// util
import {
  asyncFocus,
  contextOf,
  ellipsize,
  headValue,
  pathToContext,
} from '../util'

/**
 * Creates a new thought.
 *
 * @param offset - Cursor offset.
 * @param preventSplit - Set to true to prevent splitting thought.
 */
const newThought = ({ offset, preventSplit }: { offset: number, preventSplit?: boolean }): ActionCreator => (dispatch, getState) => {
  const state = getState()
  const { cursor } = state

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

  // split the thought at the selection
  // do not split at the beginning of a line as the common case is to want to create a new thought after, and shift + Enter is so near
  // do not split with gesture, as Enter is avialable and separate in the context of mobile
  const split = !preventSplit && cursor && isFocusOnEditable && !showContexts && offset > 0 && offset < headValue(cursor).length

  if ((!split || !uneditable) && isMobile && isSafari) {
    asyncFocus()
  }

  dispatch(split
    ? uneditable && cursor
      ? { type: 'error', value: `"${ellipsize(headValue(cursor))}" is uneditable and cannot be split.` }
      : { type: 'splitThought', offset }
    : { type: 'newThought', value: '' }
  )
}

export default newThought
