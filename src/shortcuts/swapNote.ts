import Shortcut from '../@types/Shortcut'
import { swapNoteActionCreator } from '../actions/swapNote'
import ConvertToNoteIcon from '../components/icons/ConvertToNoteIcon'
import asyncFocus from '../device/asyncFocus'
import isDocumentEditable from '../util/isDocumentEditable'

const swapNote: Shortcut = {
  id: 'swapNote',
  label: 'Convert to Note',
  description: 'Convert a thought to a note.',
  keyboard: { key: 'n', alt: true, shift: true },
  gesture: 'ulr',
  svg: ConvertToNoteIcon,
  canExecute: getState => isDocumentEditable() && !!getState().cursor,
  exec: (dispatch, getState) => {
    asyncFocus()
    dispatch(swapNoteActionCreator())
  },
}

export default swapNote
