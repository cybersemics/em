import Shortcut from '../@types/Shortcut'
import PencilIcon from '../components/icons/PencilIcon'
import asyncFocus from '../device/asyncFocus'
import { swapNoteActionCreator } from '../reducers/swapNote'
import isDocumentEditable from '../util/isDocumentEditable'

const swapNote: Shortcut = {
  id: 'swapNote',
  label: 'Convert to Note',
  description: 'Convert a thought to a note.',
  keyboard: { key: 'n', alt: true, shift: true },
  gesture: 'ulr',
  svg: PencilIcon,
  canExecute: getState => isDocumentEditable() && !!getState().cursor,
  exec: (dispatch, getState) => {
    asyncFocus()
    dispatch(swapNoteActionCreator())
  },
}

export default swapNote
