import { Key } from 'ts-key-enum'
import Shortcut from '../@types/Shortcut'
import { newThoughtActionCreator as newThought } from '../actions/newThought'
import NewSubthoughtNextIcon from '../components/icons/NewSubthoughtNextIcon'
import isDocumentEditable from '../util/isDocumentEditable'
import parentOf from '../util/parentOf'

// NOTE: The keyboard shortcut for New Uncle handled in New Thought command until it is confirmed that shortcuts are evaluated in the correct order
const newUncleShortcut: Shortcut = {
  id: 'newUncle',
  label: 'New Subthought (next)',
  description: 'Add a new thought one level up. Same as creating a new thought and then outdenting it.',
  gesture: 'rdl',
  keyboard: { key: Key.Enter, meta: true, alt: true },
  svg: NewSubthoughtNextIcon,
  canExecute: getState => {
    const { cursor } = getState()
    return isDocumentEditable() && !!cursor && cursor.length > 1
  },
  exec: (dispatch, getState) => {
    const { cursor } = getState()
    if (!cursor) return
    dispatch(newThought({ at: parentOf(cursor) }))
  },
}

export default newUncleShortcut
