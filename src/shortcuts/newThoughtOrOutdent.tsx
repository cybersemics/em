import React from 'react'
import { Key } from 'ts-key-enum'
import { Icon as IconType, Shortcut } from '../types'
import { isTouch } from '../browser'
import { getOffsetWithinContent, headValue, isDocumentEditable } from '../util'
import { alert, newThought, outdent } from '../action-creators'
import { isLastVisibleChild, simplifyPath } from '../selectors'

// eslint-disable-next-line jsdoc/require-jsdoc
const Icon = ({ fill = 'black', size = 20, style }: IconType) => <svg version='1.1' className='icon' xmlns='http://www.w3.org/2000/svg' width={size} height={size} fill={fill} style={style} viewBox='0 0 19.481 19.481' enableBackground='new 0 0 19.481 19.481'>
  <g>
    <path d='m10.201,.758l2.478,5.865 6.344,.545c0.44,0.038 0.619,0.587 0.285,0.876l-4.812,4.169 1.442,6.202c0.1,0.431-0.367,0.77-0.745,0.541l-5.452-3.288-5.452,3.288c-0.379,0.228-0.845-0.111-0.745-0.541l1.442-6.202-4.813-4.17c-0.334-0.289-0.156-0.838 0.285-0.876l6.344-.545 2.478-5.864c0.172-0.408 0.749-0.408 0.921,0z' />
  </g>
</svg>

// eslint-disable-next-line jsdoc/require-jsdoc
const exec: Shortcut['exec'] = (dispatch, getState, e, { type }: { type: string }) => {
  const state = getState()
  const { cursor, editingValue } = state

  // if current edited thought is duplicate and user hits enter
  if (cursor && editingValue && headValue(cursor) !== editingValue) {
    dispatch(alert('Duplicate thoughts are not allowed within the same context.', { alertType: 'duplicateThoughts' }))
    return
  }

  // when Enter is pressed on a last empty thought, outdent it
  if (type === 'keyboard' && cursor && headValue(cursor).length === 0 && isLastVisibleChild(state, simplifyPath(state, cursor))) {
    dispatch(outdent())
  }
  // otherwise, create a new thought
  else {
    // Note: Jest triggers new thought with windowEvent which has window as target causing getOffsetWithinContent to fail
    const isTargetHTMLElement = e.target instanceof HTMLElement
    const target = e.target as HTMLElement

    // Note: e.target should be a HTMLElement and a content editable node
    const offset = cursor && isTargetHTMLElement && target.hasAttribute('contenteditable')
      ? getOffsetWithinContent(target)
      : 0

    // prevent split on gesture
    dispatch(newThought({ value: '', offset, preventSplit: type === 'gesture' }))
  }
}

const newThoughtOrOutdent: Shortcut = {
  id: 'newThoughtOrOutdent',
  name: 'newThoughtOrOutdent',
  description: 'Create a new thought or outdent if focused thought is empty.',
  keyboard: { key: Key.Enter },
  gesture: 'rd',
  svg: Icon,
  canExecute: () => isDocumentEditable(),
  exec
}

// add aliases to help with mis-swipes since MultiGesture does not support diagonal swipes
export const newThoughtAliases: Shortcut = {
  id: 'newThoughtAliases',
  name: 'newThought',
  hideFromInstructions: true,
  gesture: ['rdld', 'rdldl', 'rdldld', 'rldl', 'rldld', 'rldldl'],
  // on mobile, the shift key should cause a normal newThought, not newThoughtAbove
  // smuggle it in with the aliases
  ...isTouch ? { keyboard: { key: Key.Enter, shift: true } } : null,
  canExecute: () => isDocumentEditable(),
  exec
}

export default newThoughtOrOutdent
