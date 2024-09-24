import { Key } from 'ts-key-enum'
import Shortcut from '../@types/Shortcut'
import { newThoughtActionCreator as newThought } from '../actions/newThought'
import Icon from '../components/icons/NewSubthoughtIcon'
import isDocumentEditable from '../util/isDocumentEditable'

// eslint-disable-next-line jsdoc/require-jsdoc
const exec = newThought({ insertNewSubthought: true })

const newSubthoughtShortcut: Shortcut = {
  id: 'newSubthought',
  label: 'New Subthought',
  description: 'Create a new subthought in the current thought. Adds it to the bottom of any existing subthoughts.',
  gesture: 'rdr',
  keyboard: { key: Key.Enter, meta: true },
  svg: Icon,
  canExecute: () => isDocumentEditable(),
  exec,
}

// add aliases to help with mis-swipes since MultiGesture does not support diagonal swipes
export const newSubthoughtAliases: Shortcut = {
  id: 'newSubthoughtAliases',
  label: 'New Subthought',
  hideFromHelp: true,
  gesture: [
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
  svg: Icon,
  canExecute: () => isDocumentEditable(),
  exec,
}

export default newSubthoughtShortcut
