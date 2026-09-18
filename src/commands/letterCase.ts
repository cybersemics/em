import Command from '../@types/Command'
import { toggleDropdownActionCreator as toggleDropdown } from '../actions/toggleDropdown'
import Icon from '../components/icons/LetterCaseWithPicker'
import hasMulticursor from '../selectors/hasMulticursor'
import isDocumentEditable from '../util/isDocumentEditable'

/** Toggle the letter case picker. */
const letterCase = {
  id: 'letterCase',
  label: 'Letter Case' as const,
  description: 'Changes the letter case of the current thought or selected text.',
  svg: Icon,
  canExecute: state => isDocumentEditable() && (!!state.cursor || hasMulticursor(state)),
  multicursor: false,
  exec: (dispatch, _) => {
    dispatch(toggleDropdown({ dropDownType: 'letterCase' }))
  },
  isActive: state => !!state.cursor || hasMulticursor(state),
  isDropdownOpen: state => !!state.showLetterCase,
} satisfies Command

export default letterCase
