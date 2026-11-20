import Command from '../@types/Command'
import { swapNoteActionCreator } from '../actions/swapNote'
import SwapNoteIcon from '../components/icons/SwapNoteIcon'
import hasMulticursor from '../selectors/hasMulticursor'
import selectedPaths from '../selectors/selectedPaths'
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
    // A thought holds one note, so selected siblings would each replace their parent's note in turn, leaving only the last as the note and the others as plain thoughts with their children moved up. Swap Note is therefore disabled on them. This also disables Select All + Swap Note whenever there are several siblings (#5874).
    const parentIds = selectedPaths(state).map(path => path[path.length - 2])
    return (
      isDocumentEditable() && (!!state.cursor || hasMulticursor(state)) && new Set(parentIds).size === parentIds.length
    )
  },
  svg: SwapNoteIcon,
  exec: dispatch => {
    dispatch(swapNoteActionCreator())
  },
} satisfies Command

export default swapNote
