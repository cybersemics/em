import { Key } from 'ts-key-enum'
import Command from '../@types/Command'
import { newThoughtActionCreator as newThought } from '../actions/newThought'
import { isTouch } from '../browser'
import NewThoughtAboveIcon from '../components/icons/NewThoughtAboveIcon'
import isDocumentEditable from '../util/isDocumentEditable'

const newThoughtAboveCommand = {
  id: 'newThoughtAbove',
  label: 'New Thought (above)' as const,
  description: 'Create a new thought immediately above the current thought.',
  gesture: 'rul',
  multicursor: {
    // The newThought action sets the cursor to the thought it creates, so preventSetCursor leaves the caret in the last new thought instead of restoring the pre-command cursor, and selectNewCursors moves the selection onto the new thoughts.
    preventSetCursor: true,
    selectNewCursors: true,
  },
  ...(!isTouch ? { keyboard: { key: Key.Enter, shift: true } } : null),
  svg: NewThoughtAboveIcon,
  canExecute: () => isDocumentEditable(),
  exec: newThought({ insertBefore: true }),
  rounded: true,
} satisfies Command

export default newThoughtAboveCommand
