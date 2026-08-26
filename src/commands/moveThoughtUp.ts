import { Key } from 'ts-key-enum'
import Command from '../@types/Command'
import { moveThoughtUpActionCreator as moveThoughtUp } from '../actions/moveThoughtUp'
import MoveThoughtUpIcon from '../components/icons/MoveThoughtUpIcon'
import getThoughtBefore from '../selectors/getThoughtBefore'
import prevSibling from '../selectors/prevSibling'
import simplifyPath from '../selectors/simplifyPath'
import appendToPath from '../util/appendToPath'
import head from '../util/head'
import isDocumentEditable from '../util/isDocumentEditable'
import parentOf from '../util/parentOf'
import { isContextStep } from '../util/pathStep'

const moveThoughtUpCommand = {
  id: 'moveThoughtUp',
  label: 'Move Thought Up' as const,
  description: 'Move the current thought up.',
  gesture: 'udu',
  keyboard: { key: Key.ArrowUp, meta: true, shift: true },
  multicursor: true,
  preventDefault: true,
  svg: MoveThoughtUpIcon,
  canExecute: state => {
    const { cursor } = state

    if (!cursor || !isDocumentEditable()) return false

    const pathParent = parentOf(cursor)

    const prevThought = prevSibling(state, cursor)

    // if the cursor is on the first thought, move the thought to the end of its prev uncle
    // A context row's siblings are the other contexts, so a thought inside one has no uncle to move into — doing so
    // would take it out of the context view entirely. Decline rather than build a Path that names no rendered row.
    const prevUncleThought =
      pathParent.length > 0 && !isContextStep(head(pathParent))
        ? getThoughtBefore(state, simplifyPath(state, pathParent))
        : null
    const prevUnclePath = prevUncleThought ? appendToPath(parentOf(pathParent), prevUncleThought.id) : null

    return !!prevThought || !!prevUnclePath
  },
  exec: dispatch => dispatch(moveThoughtUp()),
} satisfies Command

export default moveThoughtUpCommand
