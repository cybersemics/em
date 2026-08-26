import { Key } from 'ts-key-enum'
import Command from '../@types/Command'
import { moveThoughtDownActionCreator as moveThoughtDown } from '../actions/moveThoughtDown'
import MoveThoughtDownIcon from '../components/icons/MoveThoughtDownIcon'
import nextSibling from '../selectors/nextSibling'
import appendToPath from '../util/appendToPath'
import head from '../util/head'
import isDocumentEditable from '../util/isDocumentEditable'
import parentOf from '../util/parentOf'
import { isContextStep } from '../util/pathStep'

const moveThoughtDownCommand = {
  id: 'moveThoughtDown',
  label: 'Move Thought Down' as const,
  description: 'Move the current thought down.',
  gesture: 'dud',
  keyboard: { key: Key.ArrowDown, meta: true, shift: true },
  multicursor: {
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
    // A context row's siblings are the other contexts, so a thought inside one has no uncle to move into — doing so
    // would take it out of the context view entirely. Decline rather than build a Path that names no rendered row.
    const nextUncleThought =
      pathParent.length > 0 && !isContextStep(head(pathParent)) ? nextSibling(state, pathParent) : null
    const nextUnclePath = nextUncleThought ? appendToPath(parentOf(pathParent), nextUncleThought.id) : null

    return !!nextThought || !!nextUnclePath
  },
  exec: dispatch => dispatch(moveThoughtDown()),
} satisfies Command

export default moveThoughtDownCommand
