import { Key } from 'ts-key-enum'
import Shortcut from '../@types/Shortcut'
import { newThoughtActionCreator as newThought } from '../actions/newThought'
import NewSubthoughtAboveIcon from '../components/icons/NewSubthoughtAboveIcon'
import isDocumentEditable from '../util/isDocumentEditable'

const newSubthoughtTopShortcut: Shortcut = {
  id: 'newSubthoughtTop',
  label: 'New Subthought (above)',
  description: 'Create a new subthought in the current thought. Add it to the top of any existing subthoughts.',
  gesture: 'rdu',
  keyboard: { key: Key.Enter, shift: true, meta: true },
  svg: NewSubthoughtAboveIcon,
  canExecute: () => isDocumentEditable(),
  exec: newThought({ insertNewSubthought: true, insertBefore: true }),
}

export default newSubthoughtTopShortcut
