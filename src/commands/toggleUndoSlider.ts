import Command from '../@types/Command'
import { toggleDropdownActionCreator as toggleDropdown } from '../actions/toggleDropdown'
import Icon from '../components/icons/CategorizeIcon'

const toggleUndoSlider = {
  id: 'toggleUndoSlider',
  label: 'Toggle Undo Slider' as const,
  description: 'Toggle a handy slider that lets you rewind edits.',
  multicursor: false,
  hideFromHelp: true,
  hideFromDesktopCommandUniverse: true,
  svg: Icon,
  exec: dispatch => {
    dispatch(toggleDropdown({ dropDownType: 'undoSlider' }))
  },
  isDropdownOpen: state => !!state.showUndoSlider,
} satisfies Command

export default toggleUndoSlider
