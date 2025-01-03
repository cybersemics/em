import { Key } from 'ts-key-enum'
import Command from '../@types/Command'
import { moveThoughtDownActionCreator as moveThoughtDown } from '../actions/moveThoughtDown'
import MoveThoughtDownIcon from '../components/icons/MoveThoughtDownIcon'
import nextSibling from '../selectors/nextSibling'
import appendToPath from '../util/appendToPath'
import isDocumentEditable from '../util/isDocumentEditable'
import parentOf from '../util/parentOf'

const moveThoughtDownShortcut: Command = {
  id: 'moveThoughtDown',
  label: 'Move Thought Down',
  description: 'Move the current thought down.',
  gesture: 'dud',
  keyboard: { key: Key.ArrowDown, meta: true, shift: true },
  multicursor: {
    enabled: true,
    reverse: true,
  },
  preventDefault: true,
  svg: MoveThoughtDownIcon,
  canExecute: state => {
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
