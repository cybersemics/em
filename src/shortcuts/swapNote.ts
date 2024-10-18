import Shortcut from '../@types/Shortcut'
import { swapNoteActionCreator } from '../actions/swapNote'
import ConvertToNoteIcon from '../components/icons/ConvertToNoteIcon'
import asyncFocus from '../device/asyncFocus'
import hasMulticursor from '../selectors/hasMulticursor'
import isDocumentEditable from '../util/isDocumentEditable'

const swapNote: Shortcut = {
  id: 'swapNote',
  label: 'Convert to Note',
  description: 'Convert a thought to a note.',
  keyboard: { key: 'n', alt: true, shift: true },
  gesture: 'ulr',
  multicursor: true,
  canExecute: getState => {
    const state = getState()
    return isDocumentEditable() && (!!state.cursor || hasMulticursor(state))
  },
  svg: ConvertToNoteIcon,
  exec: (dispatch, getState) => {
    asyncFocus()
    dispatch(swapNoteActionCreator())
  },
}

export default swapNote
