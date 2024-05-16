import Shortcut from '../@types/Shortcut'
import { bumpThoughtDownActionCreator as bumpThoughtDown } from '../actions/bumpThoughtDown'
import asyncFocus from '../device/asyncFocus'
import * as selection from '../device/selection'
import isDocumentEditable from '../util/isDocumentEditable'

const bumpThoughtDownShortcut: Shortcut = {
  id: 'bumpThoughtDown',
  label: 'Bump Thought Down',
  description: 'Bump the current thought down one level and replace it with a new, empty thought.',
  gesture: 'rld',
  keyboard: { key: 'd', meta: true, alt: true },
  canExecute: getState => !!getState().cursor && isDocumentEditable(),
  exec: dispatch => {
    // If there is already active selection, no need to focus to the hidden input.
    if (!selection.isActive()) {
      asyncFocus()
    }

    dispatch(bumpThoughtDown())
  },
}

export default bumpThoughtDownShortcut
