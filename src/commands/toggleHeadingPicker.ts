import Command from '../@types/Command'
import { toggleDropdownActionCreator as toggleDropdown } from '../actions/toggleDropdown'
import Heading1Icon from '../components/icons/Heading1Icon'
import getHeadingLevel from '../selectors/getHeadingLevel'
import hasMulticursor from '../selectors/hasMulticursor'
import head from '../util/head'
import isDocumentEditable from '../util/isDocumentEditable'

/** Opens a picker to set the heading level of the selected thoughts. Only the Formatting Bar renders it, so it is hidden from Help and the Command Universe, and has no gesture or keyboard shortcut. The heading0–heading5 commands remain the way to set a heading everywhere else. */
const toggleHeadingPicker = {
  id: 'toggleHeadingPicker',
  label: 'Heading' as const,
  description: 'Open a picker to turn the current thought into a heading, or back into normal text.',
  multicursor: false,
  hideFromHelp: true,
  hideFromDesktopCommandUniverse: true,
  svg: Heading1Icon,
  canExecute: state => isDocumentEditable() && (!!state.cursor || hasMulticursor(state)),
  exec: (dispatch, _, __, { type }) => {
    dispatch(
      toggleDropdown({
        dropDownType: 'headingPicker',
        surface: type === 'formattingBar' ? 'formattingBar' : 'toolbar',
      }),
    )
  },
  isActive: state => !!state.cursor && getHeadingLevel(state, head(state.cursor)) > 0,
  isDropdownOpen: state => !!(state.activeDropdown?.picker === 'headingPicker'),
} satisfies Command

export default toggleHeadingPicker
