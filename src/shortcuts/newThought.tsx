import { Key } from 'ts-key-enum'
import IconType from '../@types/Icon'
import Shortcut from '../@types/Shortcut'
import { newThoughtActionCreator as newThought } from '../actions/newThought'
import { isTouch } from '../browser'
import * as selection from '../device/selection'
import isDocumentEditable from '../util/isDocumentEditable'

// eslint-disable-next-line jsdoc/require-jsdoc, react-refresh/only-export-components
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
      <path d='M8.92,0C4,0,0,4,0,8.92s4,8.92,8.92,8.92,8.92-4,8.92-8.92S13.84,0,8.92,0ZM8.92,17C4.47,17,.85,13.37.85,8.92S4.47.85,8.92.85s8.07,3.62,8.07,8.07-3.62,8.07-8.07,8.07ZM13.77,8.92c0,.23-.19.43-.43.43h-4v4c0,.23-.19.43-.43.43s-.43-.19-.43-.43v-4h-4c-.23,0-.43-.19-.43-.43s.19-.43.43-.43h4v-4c0-.23.19-.43.43-.43s.43.19.43.43v4h4c.23,0,.43.19.43.43Z' />
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
  hideFromHelp: true,
  gesture: ['rdld', 'rdldl', 'rdldld', 'rldl', 'rldld', 'rldldl'],
  // on mobile, the shift key should cause a normal newThought, not newThoughtAbove
  // smuggle it in with the aliases
  ...(isTouch ? { keyboard: { key: Key.Enter, shift: true } } : null),
  canExecute: () => isDocumentEditable(),
  exec,
}

export default newThoughtShortcut
