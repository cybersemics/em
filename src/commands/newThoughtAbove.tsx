import { Key } from 'ts-key-enum'
import Command from '../@types/Command'
import { newThoughtActionCreator as newThought } from '../actions/newThought'
import { isTouch } from '../browser'
import NewThoughtAboveIcon from '../components/icons/NewThoughtAboveIcon'
import isDocumentEditable from '../util/isDocumentEditable'

const newThoughtAboveCommand: Command = {
  id: 'newThoughtAbove',
  label: 'New Thought (above)',
  description: 'Create a new thought immediately above the current thought.',
  gesture: 'rul',
  multicursor: {
    enabled: false,
    error: 'Cannot create a new thought with multiple thoughts.',
  },
  ...(!isTouch ? { keyboard: { key: Key.Enter, shift: true } } : null),
  svg: NewThoughtAboveIcon,
  canExecute: () => isDocumentEditable(),
  exec: newThought({ insertBefore: true }),
  rounded: true,
}

export default newThoughtAboveCommand
