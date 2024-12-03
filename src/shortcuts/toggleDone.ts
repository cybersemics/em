import Command from '../@types/Command'
import { toggleThoughtActionCreator as toggleThought } from '../actions/toggleThought'
import Icon from '../components/icons/Check'
import findDescendant from '../selectors/findDescendant'
import hasMulticursor from '../selectors/hasMulticursor'
import head from '../util/head'
import isDocumentEditable from '../util/isDocumentEditable'

/** Toggle the built-in =done style to cross out an item. */
const toggleDone: Command = {
  id: 'toggleDone',
  label: 'Mark as done',
  labelInverse: 'Unmark as done',
  description: 'Crosses out a thought to mark it as completed.',
  descriptionInverse: 'Unmarks a thought as done.',
  keyboard: { alt: true, shift: true, key: 'Enter' },
  multicursor: true,
  canExecute: state => {
    return isDocumentEditable() && (!!state.cursor || hasMulticursor(state))
  },
  isActive: state => {
    const cursor = state.cursor
    return !!cursor && !!findDescendant(state, head(cursor), ['=done'])
  },
  exec: (dispatch, getState) => {
    const state = getState()
    const cursor = state.cursor!
    dispatch(
      toggleThought({
        path: cursor,
        values: ['=done'],
      }),
    )
  },
  svg: Icon,
}

export default toggleDone
