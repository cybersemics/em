import Command from '../@types/Command'
import { bumpThoughtDownActionCreator as bumpThoughtDown } from '../actions/bumpThoughtDown'
import BumpThoughtDownIcon from '../components/icons/BumpThoughtDownIcon'
import asyncFocus from '../device/asyncFocus'
import * as selection from '../device/selection'
import hasMulticursor from '../selectors/hasMulticursor'
import isDocumentEditable from '../util/isDocumentEditable'

const bumpThoughtDownCommand: Command = {
  id: 'bumpThoughtDown',
  label: 'Bump Thought Down',
  description: 'Bump the current thought down one level and replace it with a new, empty thought.',
  gesture: 'drd',
  keyboard: { key: 'd', meta: true, alt: true },
  // The command ends with the caret in a new empty thought ready for typing, so keep the cursor where
  // the last execution put it and clear the selection, as newThought does. Restoring the original
  // cursor would move the caret off the empty thought whenever the bumped thought had no children,
  // since the recomputed path then leads to the moved value rather than its empty replacement.
  multicursor: {
    preventSetCursor: true,
    clearMulticursor: true,
  },
  svg: BumpThoughtDownIcon,
  canExecute: state => {
    return isDocumentEditable() && (!!state.cursor || hasMulticursor(state))
  },
  exec: dispatch => {
    // If there is already active selection, no need to focus to the hidden input.
    if (!selection.isActive()) {
      asyncFocus()
    }

    dispatch(bumpThoughtDown())
  },
}

export default bumpThoughtDownCommand
