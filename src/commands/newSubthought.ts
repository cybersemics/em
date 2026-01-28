import { Key } from 'ts-key-enum'
import Command from '../@types/Command'
import { newThoughtActionCreator as newThought } from '../actions/newThought'
import Icon from '../components/icons/NewSubthoughtIcon'
import isDocumentEditable from '../util/isDocumentEditable'

const exec = newThought({ insertNewSubthought: true })

const multicursor: Command['multicursor'] = {
  filter: 'last-sibling',
  clearMulticursor: true,
  preventSetCursor: true,
}

const newSubthoughtCommand = {
  id: 'newSubthought',
  label: 'New Subthought',
  description: 'Create a new subthought in the current thought. Adds it to the bottom of any existing subthoughts.',
  // Main gesture and alternative patterns to help with mis-swipes since MultiGesture does not support diagonal swipes
  gesture: [
    'rdr',
    'rdldr',
    'rdldlr',
    'rdldldr',
    'rldr',
    'rldlr',
    'rldldr',
    'rldldlr',
    'rdru',
    'rdrdru',
    'rdrdrru',
    'rdrdrdru',
    'rlru',
    'rdrlru',
    'rdrdlru',
    'rdrdrlru',
    'rdllru',
    'rdrdrd',
    'rdrdrrd',
    'rdrdrdrd',
    'rdlrd',
    'rdldrd',
    'rdldlrd',
    'rdlru',
    'rdldru',
    'rdldlru',
    'rdldldru',
    'rldru',
    'rldlru',
    'rldldru',
    'rldldlru',
  ],
  keyboard: { key: Key.Enter, meta: true },
  multicursor,
  svg: Icon,
  canExecute: () => isDocumentEditable(),
  exec,
} satisfies Command

export default newSubthoughtCommand
