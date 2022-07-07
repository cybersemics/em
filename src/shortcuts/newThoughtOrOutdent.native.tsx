import React from 'react'
import Svg, { G, Path } from 'react-native-svg'
import { Key } from 'ts-key-enum'
import IconType from '../@types/Icon'
import Shortcut from '../@types/Shortcut'
import newThought from '../action-creators/newThought'
import outdent from '../action-creators/outdent'
import { isTouch } from '../browser'
import isLastVisibleChild from '../selectors/isLastVisibleChild'
import simplifyPath from '../selectors/simplifyPath'
import headValue from '../util/headValue'
import isDocumentEditable from '../util/isDocumentEditable'

// eslint-disable-next-line jsdoc/require-jsdoc
const Icon = ({ fill = 'black', size = 20 }: IconType) => (
  <Svg width={size} height={size} fill={fill} viewBox='0 0 19.481 19.481'>
    <G>
      <Path d='m10.201,.758l2.478,5.865 6.344,.545c0.44,0.038 0.619,0.587 0.285,0.876l-4.812,4.169 1.442,6.202c0.1,0.431-0.367,0.77-0.745,0.541l-5.452-3.288-5.452,3.288c-0.379,0.228-0.845-0.111-0.745-0.541l1.442-6.202-4.813-4.17c-0.334-0.289-0.156-0.838 0.285-0.876l6.344-.545 2.478-5.864c0.172-0.408 0.749-0.408 0.921,0z' />
    </G>
  </Svg>
)

// eslint-disable-next-line jsdoc/require-jsdoc
const exec: Shortcut['exec'] = (dispatch, getState, e, { type }: { type: string }) => {
  const state = getState()
  const { cursor } = state

  // when Enter is pressed on a last empty thought, outdent it
  if (
    type === 'keyboard' &&
    cursor &&
    headValue(state, cursor).length === 0 &&
    isLastVisibleChild(state, simplifyPath(state, cursor))
  ) {
    dispatch(outdent())
  }
  // otherwise, create a new thought
  else {
    // TODO: find a way to get splitResult object
    // const splitResult = cursor ? selection.split(e.target as HTMLElement) : null

    // prevent split on gesture
    dispatch(newThought({ value: '', preventSplit: type === 'gesture' }))
  }
}

const newThoughtOrOutdent: Shortcut = {
  id: 'newThoughtOrOutdent',
  label: 'New Thought',
  description: 'Create a new thought or outdent if focused thought is empty.',
  keyboard: { key: Key.Enter },
  gesture: 'rd',
  svg: Icon,
  canExecute: () => isDocumentEditable(),
  exec,
}

// add aliases to help with mis-swipes since MultiGesture does not support diagonal swipes
export const newThoughtAliases: Shortcut = {
  id: 'newThoughtAliases',
  label: 'New Thought',
  hideFromInstructions: true,
  gesture: ['rdld', 'rdldl', 'rdldld', 'rldl', 'rldld', 'rldldl'],
  // on mobile, the shift key should cause a normal newThought, not newThoughtAbove
  // smuggle it in with the aliases
  ...(isTouch ? { keyboard: { key: Key.Enter, shift: true } } : null),
  canExecute: () => isDocumentEditable(),
  exec,
}

export default newThoughtOrOutdent
