import { Key } from 'ts-key-enum'
import Command from '../@types/Command'
import { newThoughtActionCreator as newThought } from '../actions/newThought'
import NewSubthoughtNextIcon from '../components/icons/NewSubthoughtNextIcon'
import isDocumentEditable from '../util/isDocumentEditable'
import parentOf from '../util/parentOf'

// NOTE: The keyboard shotcut for New Uncle handled in New Thought command until it is confirmed that commands are evaluated in the correct order
const newUncleCommand: Command = {
  id: 'newUncle',
  label: 'New Subthought (next)',
  description: 'Add a new thought one level up. Same as creating a new thought and then outdenting it.',
  keyboard: { key: Key.Enter, meta: true, alt: true },
  multicursor: {
    disallow: true,
    error: 'Cannot create a new subthought with multiple thoughts.',
  },
  svg: NewSubthoughtNextIcon,
  canExecute: state => {
    const { cursor } = state
    return isDocumentEditable() && !!cursor && cursor.length > 1
  },
  exec: (dispatch, getState) => {
    const { cursor } = getState()
    if (!cursor) return
    dispatch(newThought({ at: parentOf(cursor) }))
  },
}

export default newUncleCommand
