import { isDocumentEditable } from '../util'
import { bumpThoughtDown } from '../action-creators'
import asyncFocus from '../device/asyncFocus'
import { Shortcut } from '../@types'
import * as selection from '../device/selection'

const bumpThoughtDownShortcut: Shortcut = {
  id: 'bumpThought',
  label: 'Bump Thought Down',
  description: 'Bump the current thought down to its children and replace with empty text.',
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
