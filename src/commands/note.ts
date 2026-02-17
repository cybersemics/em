import Command from '../@types/Command'
import { toggleNoteActionCreator as toggleNote } from '../actions/toggleNote'
import PencilIcon from '../components/icons/PencilIcon'
import { HOME_PATH } from '../constants'
import asyncFocus from '../device/asyncFocus'
import simplifyPath from '../selectors/simplifyPath'
import isDocumentEditable from '../util/isDocumentEditable'
import noteValue from '../util/noteValue'
import gestures from './gestures'

const noteCommand: Command = {
  id: 'note',
  label: 'Note',
  description: 'Add a small note beneath a thought. Cute!',
  keyboard: { key: 'n', alt: true, meta: true },
  gesture: gestures.NOTE_GESTURE,
  multicursor: {
    disallow: true,
    error: 'Cannot create a note with multiple thoughts.',
  },
  svg: PencilIcon,
  canExecute: state => isDocumentEditable() && !!state.cursor,
  exec: (dispatch, getState) => {
    const state = getState()
    const { cursor } = state

    // check cursor in exec rather than short-circuiting in canExecute so that the default browser behavior is always prevented
    if (!cursor) return

    asyncFocus()
    dispatch(toggleNote())
  },
  isActive: state => {
    const { cursor } = state
    const path = cursor ? simplifyPath(state, cursor) : HOME_PATH
    return noteValue(state, path) !== null
  },
}

export default noteCommand
