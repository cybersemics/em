import React from 'react'
import { store } from '../store.js'
import { error } from '../action-creators/error.js'

// action-creators
import { newThoughtAtCursor } from '../action-creators/newThoughtAtCursor'
import { newThought as newThoughtActionCreator } from '../action-creators/newThought'

// constants
import {
  TUTORIAL_STEP_START,
} from '../constants.js'

// util
import {
  contextOf,
  ellipsize,
  getSetting,
  headValue,
  isContextViewActive,
  meta,
  pathToContext,
} from '../util.js'

const Icon = ({ fill = 'black', size = 20, style }) => <svg version="1.1" className="icon" xmlns="http://www.w3.org/2000/svg" width={size} height={size} fill={fill} style={style} viewBox="0 0 19.481 19.481" enableBackground="new 0 0 19.481 19.481">
  <g>
    <path d="m10.201,.758l2.478,5.865 6.344,.545c0.44,0.038 0.619,0.587 0.285,0.876l-4.812,4.169 1.442,6.202c0.1,0.431-0.367,0.77-0.745,0.541l-5.452-3.288-5.452,3.288c-0.379,0.228-0.845-0.111-0.745-0.541l1.442-6.202-4.813-4.17c-0.334-0.289-0.156-0.838 0.285-0.876l6.344-.545 2.478-5.864c0.172-0.408 0.749-0.408 0.921,0z" />
  </g>
</svg>

// newThought command handler that does some pre-processing before handing off to newThought
const exec = (e, { type }) => {
  const { cursor } = store.getState()
  const tutorial  = getSetting('Tutorial')[0] !== 'Off'
  const tutorialStep = +getSetting('Tutorial Step')[0]

  // cancel if tutorial has just started
  if (tutorial && tutorialStep === TUTORIAL_STEP_START) return

  // cancel if parent is readonly
  if (cursor) {
    if (meta(pathToContext(contextOf(cursor))).readonly) {
      error(`"${ellipsize(headValue(contextOf(cursor)))}" is read-only. No subthoughts may be added.`)
      return
    }
    else if (meta(pathToContext(contextOf(cursor))).unextendable) {
      error(`"${ellipsize(headValue(contextOf(cursor)))}" is unextendable. No subthoughts may be added.`)
      return
    }
  }

  const offset = window.getSelection().focusOffset
  const showContexts = cursor && isContextViewActive(contextOf(cursor), { state: store.getState() })

  // split the thought at the selection
  // do not split at the beginning of a line as the common case is to want to create a new thought after, and shift + Enter is so near
  // do not split with gesture, as Enter is avialable and separate in the context of mobile
  const split = type !== 'gesture' && cursor && !showContexts && offset > 0 && offset < headValue(cursor).length

  if (split) {
    store.dispatch(newThoughtAtCursor())
  }
  else {
    store.dispatch(newThoughtActionCreator({ value: '' }))
  }
}

export default {
  id: 'newThought',
  name: 'New Thought',
  description: 'Create a new thought.',
  keyboard: { key: 'Enter' },
  gesture: 'rd',
  svg: Icon,
  exec
}

// add aliases to help with mis-swipes since MultiGesture does not support diagonal swipes
export const newThoughtAliases = {
  id: 'newThoughtAliases',
  hideFromInstructions: true,
  gesture: ['rdld', 'rdldl', 'rdldld', 'rld', 'rldl', 'rldld', 'rldldl'],
  exec
}
