import { Key } from 'ts-key-enum'
import IconType from '../@types/Icon'
import Shortcut from '../@types/Shortcut'
import { moveThoughtDownActionCreator as moveThoughtDown } from '../actions/moveThoughtDown'
import nextSibling from '../selectors/nextSibling'
import appendToPath from '../util/appendToPath'
import isDocumentEditable from '../util/isDocumentEditable'
import parentOf from '../util/parentOf'

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
      <path d='m10.201,.758l2.478,5.865 6.344,.545c0.44,0.038 0.619,0.587 0.285,0.876l-4.812,4.169 1.442,6.202c0.1,0.431-0.367,0.77-0.745,0.541l-5.452-3.288-5.452,3.288c-0.379,0.228-0.845-0.111-0.745-0.541l1.442-6.202-4.813-4.17c-0.334-0.289-0.156-0.838 0.285-0.876l6.344-.545 2.478-5.864c0.172-0.408 0.749-0.408 0.921,0z' />
    </g>
  </svg>
)

const moveThoughtDownShortcut: Shortcut = {
  id: 'moveThoughtDown',
  label: 'Move Thought Down',
  description: 'Move the current thought down.',
  gesture: 'dud',
  keyboard: { key: Key.ArrowDown, meta: true, shift: true },
  multicursor: {
    enabled: true,
    reverse: true,
  },
  svg: Icon,
  canExecute: getState => {
    const state = getState()
    const { cursor } = state

    if (!cursor || !isDocumentEditable()) return false

    const pathParent = parentOf(cursor)
    const nextThought = nextSibling(state, cursor)

    // if the cursor is the last child, move the thought to the beginning of its next uncle
    const nextUncleThought = pathParent.length > 0 ? nextSibling(state, pathParent) : null
    const nextUnclePath = nextUncleThought ? appendToPath(parentOf(pathParent), nextUncleThought.id) : null

    return !!nextThought || !!nextUnclePath
  },
  exec: dispatch => dispatch(moveThoughtDown()),
}

export default moveThoughtDownShortcut
