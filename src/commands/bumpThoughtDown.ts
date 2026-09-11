import Command from '../@types/Command'
import { bumpThoughtDownActionCreator as bumpThoughtDown } from '../actions/bumpThoughtDown'
import BumpThoughtDownIcon from '../components/icons/BumpThoughtDownIcon'
import asyncFocus from '../device/asyncFocus'
import * as selection from '../device/selection'
import hasMulticursor from '../selectors/hasMulticursor'
import isDocumentEditable from '../util/isDocumentEditable'

const bumpThoughtDownCommand = {
  id: 'bumpThoughtDown',
  label: 'Bump Thought Down' as const,
  description: 'Bump the current thought down one level and replace it with a new, empty thought.',
  gesture: 'drd',
  // Command + Option + d is unusable, as macOS reserves it for "Turn Dock Hiding On/Off" and never delivers the
  // keydown to the browser (#4924).
  keyboard: { key: 'd', meta: true, shift: true },
  // The command ends with the caret in a new empty thought ready for typing, so keep the cursor where
  // the reducer put it and clear the selection, as newThought does. Restoring the original cursor
  // would move the caret off the empty thought, since the recomputed path then leads to the moved
  // value rather than its empty replacement.
  multicursor: {
    // Bump the selected thoughts' parent down and move the selected thoughts into it in a single action.
    execMulticursor: (cursors, dispatch) => {
      dispatch(bumpThoughtDown({ paths: cursors }))
    },
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
} satisfies Command

export default bumpThoughtDownCommand
