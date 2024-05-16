import { Key } from 'ts-key-enum'
import IconType from '../@types/Icon'
import Shortcut from '../@types/Shortcut'
import { newThoughtActionCreator as newThought } from '../actions/newThought'
import { isTouch } from '../browser'
import * as selection from '../device/selection'
import isDocumentEditable from '../util/isDocumentEditable'

// eslint-disable-next-line jsdoc/require-jsdoc
const Icon = ({ fill = 'black', size = 20, style }: IconType) => (
  <svg
    version='1.1'
    className='icon'
    xmlns='http://www.w3.org/2000/svg'
    width={size}
    height={size}
    fill={fill}
    style={style}
    viewBox='0 0 19.481 19.481'
    enableBackground='new 0 0 19.481 19.481'
  >
    <g>
      <path d='m10.201,.758l2.478,5.865 6.344,.545c0.44,0.038 0.619,0.587 0.285,0.876l-4.812,4.169 1.442,6.202c0.1,0.431-0.367,0.77-0.745,0.541l-5.452-3.288-5.452,3.288c-0.379,0.228-0.845-0.111-0.745-0.541l1.442-6.202-4.813-4.17c-0.334-0.289-0.156-0.838 0.285-0.876l6.344-.545 2.478-5.864c0.172-0.408 0.749-0.408 0.921,0z' />
    </g>
  </svg>
)

// eslint-disable-next-line jsdoc/require-jsdoc
const exec: Shortcut['exec'] = (dispatch, getState, e, { type }: { type: string }) => {
  const state = getState()
  const { cursor } = state

  // create a new thought
  const splitResult = cursor ? selection.split(e.target as HTMLElement) : null

  // prevent split on gesture
  dispatch(newThought({ value: '', splitResult, preventSplit: type === 'gesture' }))
}

const newThoughtShortcut: Shortcut = {
  id: 'newThought',
  label: 'New Thought',
  description: 'Create a shiny new thought.',
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

export default newThoughtShortcut
