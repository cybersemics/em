import Shortcut from '../@types/Shortcut'
import { toggleThoughtActionCreator as toggleThought } from '../actions/toggleThought'
import Icon from '../components/icons/Check'
import findDescendant from '../selectors/findDescendant'
import hasMulticursor from '../selectors/hasMulticursor'
import head from '../util/head'
import isDocumentEditable from '../util/isDocumentEditable'

/** Toggle the built-in =done style to cross out an item. */
const toggleDone: Shortcut = {
  id: 'toggleDone',
  label: 'Mark as done',
  labelInverse: 'Unmark as done',
  description: 'Crosses out a thought to mark it as completed.',
  descriptionInverse: 'Unmarks a thought as done.',
  keyboard: { alt: true, shift: true, key: 'Enter' },
  multicursor: {
    enabled: true,
    preventSetCursor: true,
  },
  canExecute: getState => {
    const state = getState()
    return isDocumentEditable() && (!!state.cursor || hasMulticursor(state))
  },
  isActive: getState => {
    const state = getState()
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
