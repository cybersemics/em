import Command from '../@types/Command'
import { toggleThoughtActionCreator as toggleThought } from '../actions/toggleThought'
import Icon from '../components/icons/Check'
import findDescendant from '../selectors/findDescendant'
import getThoughtById from '../selectors/getThoughtById'
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
    if (!isDocumentEditable()) return false
    if (!state.cursor && !hasMulticursor(state)) return false
    // do not allow marking empty thoughts as done
    if (state.cursor && getThoughtById(state, head(state.cursor))?.value === '') return false
    return true
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
