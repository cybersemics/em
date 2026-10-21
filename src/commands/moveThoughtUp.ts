import Command from '../@types/Command'
import { moveThoughtUpActionCreator as moveThoughtUp } from '../actions/moveThoughtUp'
import MoveThoughtUpIcon from '../components/icons/MoveThoughtUpIcon'
import getThoughtBefore from '../selectors/getThoughtBefore'
import prevSibling from '../selectors/prevSibling'
import simplifyPath from '../selectors/simplifyPath'
import appendToPath from '../util/appendToPath'
import isAttribute from '../util/isAttribute'
import isDocumentEditable from '../util/isDocumentEditable'
import parentOf from '../util/parentOf'

const moveThoughtUpCommand = {
  id: 'moveThoughtUp',
  label: 'Move Thought Up' as const,
  description: 'Move the current thought up.',
  gesture: 'udu',
  keyboard: { key: 'ArrowUp', meta: true, shift: true },
  multicursor: true,
  preventDefault: true,
  svg: MoveThoughtUpIcon,
  canExecute: state => {
    const { cursor } = state

    if (!cursor || !isDocumentEditable()) return false

    const pathParent = parentOf(cursor)

    const prevThought = prevSibling(state, cursor)

    // if the cursor is on the first thought, move the thought to the end of its prev uncle
    const prevUncleThought = pathParent.length > 0 ? getThoughtBefore(state, simplifyPath(state, pathParent)) : null
    // a metaprogramming attribute is read-only, so a thought cannot be moved into it
    const prevUnclePath =
      prevUncleThought && !isAttribute(prevUncleThought.value)
        ? appendToPath(parentOf(pathParent), prevUncleThought.id)
        : null

    return !!prevThought || !!prevUnclePath
  },
  exec: dispatch => dispatch(moveThoughtUp()),
} satisfies Command

export default moveThoughtUpCommand
