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
      <path d='M9.99,0C4.48,0,0,4.48,0,9.99s4.48,9.99,9.99,9.99,9.99-4.48,9.99-9.99S15.5,0,9.99,0ZM9.99,19.03C5.01,19.03.95,14.97.95,9.99S5.01.95,9.99.95s9.04,4.05,9.04,9.04-4.05,9.04-9.04,9.04ZM15.42,9.99c0,.26-.21.48-.48.48h-4.48v4.48c0,.26-.21.48-.48.48s-.48-.21-.48-.48v-4.48h-4.48c-.26,0-.48-.21-.48-.48s.21-.48.48-.48h4.48v-4.48c0-.26.21-.48.48-.48s.48.21.48.48v4.48h4.48c.26,0,.48.21.48.48Z' />
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
