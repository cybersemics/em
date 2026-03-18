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
  multicursor: {
    disallow: true,
    error: 'Cannot bump down multiple thoughts.',
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
