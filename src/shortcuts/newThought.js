import React from 'react'
import { isMobile } from '../browser'

// action-creators
import newThoughtAtCursor from '../action-creators/newThoughtAtCursor'
import newThought from '../action-creators/newThought'

// constants
import {
  TUTORIAL_STEP_START,
} from '../constants'

// util
import {
  contextOf,
  headValue,
  isDocumentEditable,
  pathToContext,
} from '../util'

// selectors
import {
  getSetting,
  isContextViewActive,
  meta,
} from '../selectors'

// eslint-disable-next-line jsdoc/require-jsdoc
const Icon = ({ fill = 'black', size = 20, style }) => <svg version="1.1" className="icon" xmlns="http://www.w3.org/2000/svg" width={size} height={size} fill={fill} style={style} viewBox="0 0 19.481 19.481" enableBackground="new 0 0 19.481 19.481">
  <g>
    <path d="m10.201,.758l2.478,5.865 6.344,.545c0.44,0.038 0.619,0.587 0.285,0.876l-4.812,4.169 1.442,6.202c0.1,0.431-0.367,0.77-0.745,0.541l-5.452-3.288-5.452,3.288c-0.379,0.228-0.845-0.111-0.745-0.541l1.442-6.202-4.813-4.17c-0.334-0.289-0.156-0.838 0.285-0.876l6.344-.545 2.478-5.864c0.172-0.408 0.749-0.408 0.921,0z" />
  </g>
</svg>

/** newThought command handler that does some pre-processing before handing off to newThought. */
const exec = (dispatch, getState, e, { type }) => {
  const state = getState()
  const { cursor } = state
  const tutorial = getSetting(state, 'Tutorial') !== 'Off'
  const tutorialStep = +getSetting(state, 'Tutorial Step')

  // cancel if tutorial has just started
  if (tutorial && tutorialStep === TUTORIAL_STEP_START) return

  const offset = window.getSelection().focusOffset

  // making sure the current focus in on the editable component to prevent splitting
  const isFocusOnEditable = document.activeElement.classList.contains('editable')

  // Determine if thought at cursor is uneditable
  const contextOfCursor = pathToContext(cursor)
  const uneditable = contextOfCursor && meta(state, contextOfCursor).uneditable

  const showContexts = cursor && isContextViewActive(state, contextOf(cursor))

  // split the thought at the selection
  // do not split at the beginning of a line as the common case is to want to create a new thought after, and shift + Enter is so near
  // do not split with gesture, as Enter is avialable and separate in the context of mobile
  const split = type !== 'gesture' && cursor && isFocusOnEditable && !uneditable && !showContexts && offset > 0 && offset < headValue(cursor).length

  if (split) {
    dispatch(newThoughtAtCursor())
  }
  else {
    dispatch(newThought({ value: '' }))
  }
}

export default {
  id: 'newThought',
  name: 'New Thought',
  description: 'Create a new thought.',
  keyboard: { key: 'Enter' },
  gesture: 'rd',
  svg: Icon,
  canExecute: () => isDocumentEditable(),
  exec
}

// add aliases to help with mis-swipes since MultiGesture does not support diagonal swipes
export const newThoughtAliases = {
  id: 'newThoughtAliases',
  name: 'New Thought',
  hideFromInstructions: true,
  gesture: ['rdld', 'rdldl', 'rdldld', 'rld', 'rldl', 'rldld', 'rldldl'],
  // on mobile, the shift key should cause a normal newThought, not newThoughtAbove
  // smuggle it in with the aliases
  ...isMobile ? { keyboard: { key: 'Enter', shift: true } } : null,
  canExecute: () => isDocumentEditable(),
  exec
}
