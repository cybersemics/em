import Shortcut from '../@types/Shortcut'
import thoughtToNoteActionCreator from '../action-creators/thoughtToNote'
import PencilIcon from '../components/icons/PencilIcon'
import asyncFocus from '../device/asyncFocus'
import isDocumentEditable from '../util/isDocumentEditable'

const thoughtToNote: Shortcut = {
  id: 'thoughtToNote',
  label: 'Convert to Note',
  description: 'Convert a thought to a note.',
  keyboard: { key: 'n', alt: true, shift: true },
  gesture: 'ulr',
  svg: PencilIcon,
  canExecute: getState => isDocumentEditable() && !!getState().cursor,
  exec: (dispatch, getState) => {
    asyncFocus()
    dispatch(thoughtToNoteActionCreator())
  },
}

export default thoughtToNote
