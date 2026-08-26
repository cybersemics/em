import Command from '../@types/Command'
import { toggleThoughtActionCreator as toggleThought } from '../actions/toggleThought'
import Icon from '../components/icons/Check'
import findDescendant from '../selectors/findDescendant'
import hasMulticursor from '../selectors/hasMulticursor'
import parentContextId from '../selectors/parentContextId'
import headValue from '../util/headValue'
import isDocumentEditable from '../util/isDocumentEditable'

/** Toggle the built-in =done style to cross out an item. */
const toggleDone = {
  id: 'toggleDone',
  label: 'Mark as done' as const,
  labelInverse: 'Unmark as done',
  description: 'Crosses out a thought to mark it as completed.',
  descriptionInverse: 'Unmarks a thought as done.',
  keyboard: { alt: true, shift: true, key: 'Enter' },
  multicursor: true,
  canExecute: state => {
    if (!isDocumentEditable()) return false
    if (!state.cursor && !hasMulticursor(state)) return false
    // do not allow marking empty thoughts as done
    if (state.cursor && headValue(state, state.cursor) === '') return false
    return true
  },
  isActive: state => {
    const cursor = state.cursor
    // =done is set on the thought the user sees, which in the context view is the context rather than the Lexeme context
    return !!cursor && !!findDescendant(state, parentContextId(state, cursor), ['=done'])
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
} satisfies Command

export default toggleDone
