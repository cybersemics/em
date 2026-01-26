import Command from '../@types/Command'
import { swapNoteActionCreator } from '../actions/swapNote'
import SwapNoteIcon from '../components/icons/SwapNoteIcon'
import hasMulticursor from '../selectors/hasMulticursor'
import isDocumentEditable from '../util/isDocumentEditable'

const swapNote: Command = {
  id: 'swapNote',
  label: 'Swap Note',
  description: 'Convert a thought to a note.',
  keyboard: { key: 'n', alt: true, shift: true },
  gesture: 'ulr',
  multicursor: true,
  canExecute: state => {
    return isDocumentEditable() && (!!state.cursor || hasMulticursor(state))
  },
  svg: SwapNoteIcon,
  exec: dispatch => {
    dispatch(swapNoteActionCreator())
  },
}

export default swapNote
