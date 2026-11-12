import Command from '../@types/Command'
import { swapNoteActionCreator } from '../actions/swapNote'
import SwapNoteIcon from '../components/icons/SwapNoteIcon'
import selectedPaths from '../selectors/selectedPaths'
import headValue from '../util/headValue'
import isAttribute from '../util/isAttribute'
import isDocumentEditable from '../util/isDocumentEditable'

const swapNote = {
  id: 'swapNote',
  label: 'Swap Note' as const,
  systemMenu: 'Edit',
  description: 'Convert a thought to a note.',
  keyboard: { key: 'n', alt: true, shift: true },
  gesture: 'ulr',
  multicursor: true,
  canExecute: state => {
    // A metaprogramming attribute such as =favorite or =pin configures its parent; turning it into a note would silently strip that configuration, so the command is disabled when any selected thought is an attribute.
    const paths = selectedPaths(state)
    return isDocumentEditable() && paths.length > 0 && paths.every(path => !isAttribute(headValue(state, path) ?? ''))
  },
  svg: SwapNoteIcon,
  exec: dispatch => {
    dispatch(swapNoteActionCreator())
  },
} satisfies Command

export default swapNote
