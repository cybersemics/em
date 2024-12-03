import Command from '../@types/Command'
import { toggleNoteActionCreator as toggleNote } from '../actions/toggleNote'
import PencilIcon from '../components/icons/PencilIcon'
import { HOME_PATH } from '../constants'
import asyncFocus from '../device/asyncFocus'
import attribute from '../selectors/attribute'
import simplifyPath from '../selectors/simplifyPath'
import head from '../util/head'
import isDocumentEditable from '../util/isDocumentEditable'

const noteShortcut: Command = {
  id: 'note',
  label: 'Note',
  description: 'Add a small note beneath a thought. Cute!',
  keyboard: { key: 'n', alt: true, meta: true },
  gesture: 'rdlr',
  multicursor: {
    enabled: false,
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
    return attribute(state, head(path), '=note') !== null
  },
}

export default noteShortcut
