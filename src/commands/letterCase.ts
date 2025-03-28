import Command from '../@types/Command'
import Icon from '../components/icons/LetterCaseWithPicker'
import isDocumentEditable from '../util/isDocumentEditable'

/** Toggle the letter case picker. */
const letterCase: Command = {
  id: 'letterCase',
  label: 'LetterCase',
  description: 'Change the Letter case.',
  svg: Icon,
  canExecute: state => isDocumentEditable() && !!state.cursor,
  multicursor: false,
  exec: (dispatch, getState) => {
    const state = getState()
    if (state.showColorPicker) dispatch({ type: 'toggleColorPicker' })
    dispatch({ type: 'toggleLetterCase' })
  },
  isActive: state => !!state.cursor,
  isDropdownOpen: state => !!state.showLetterCase,
}

export default letterCase
