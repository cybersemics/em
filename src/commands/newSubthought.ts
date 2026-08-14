import { Key } from 'ts-key-enum'
import Command from '../@types/Command'
import { newThoughtActionCreator as newThought } from '../actions/newThought'
import Icon from '../components/icons/NewSubthoughtIcon'
import isDocumentEditable from '../util/isDocumentEditable'

const exec = newThought({ insertNewSubthought: true })

const multicursor: Command['multicursor'] = {
  // Each selected thought is a distinct insertion parent, so execute once per selected thought.
  // A sibling filter would collapse a selection of siblings to a single insertion, silently discarding most of the selection.
  // preventSetCursor leaves the cursor in the last created subthought, ready to type, instead of restoring the old cursor.
  // clearMulticursor drops the stale selection so typing edits only the new subthought.
  clearMulticursor: true,
  preventSetCursor: true,
}

const newSubthoughtCommand: Command = {
  id: 'newSubthought',
  label: 'New Subthought',
  description: 'Create a new subthought in the current thought. Adds it to the bottom of any existing subthoughts.',
  gesture: 'rdr',
  keyboard: { key: Key.Enter, meta: true },
  multicursor,
  svg: Icon,
  canExecute: () => isDocumentEditable(),
  exec,
}

export default newSubthoughtCommand
