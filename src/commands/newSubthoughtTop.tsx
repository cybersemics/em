import { Key } from 'ts-key-enum'
import Command from '../@types/Command'
import { newThoughtActionCreator as newThought } from '../actions/newThought'
import NewSubthoughtAboveIcon from '../components/icons/NewSubthoughtAboveIcon'
import isDocumentEditable from '../util/isDocumentEditable'

const newSubthoughtTopCommand: Command = {
  id: 'newSubthoughtTop',
  label: 'New Subthought (above)',
  description: 'Create a new subthought in the current thought. Add it to the top of any existing subthoughts.',
  gesture: 'rdu',
  keyboard: { key: Key.Enter, shift: true, meta: true },
  multicursor: {
    disallow: true,
    error: 'Cannot create a new subthought with multiple thoughts.',
  },
  svg: NewSubthoughtAboveIcon,
  canExecute: () => isDocumentEditable(),
  exec: newThought({ insertNewSubthought: true, insertBefore: true }),
}

export default newSubthoughtTopCommand
