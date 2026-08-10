import Command from '../@types/Command'
import { toggleDropdownActionCreator as toggleDropdown } from '../actions/toggleDropdown'
import BulletStyleWithPicker from '../components/icons/BulletStyleWithPicker'
import getBulletStyle from '../selectors/getBulletStyle'
import rootedParentOf from '../selectors/rootedParentOf'
import simplifyPath from '../selectors/simplifyPath'
import head from '../util/head'
import isRoot from '../util/isRoot'

const toggleBulletPickerCommand: Command = {
  id: 'toggleBulletPicker',
  label: 'Bullet Style',
  description: 'Open a picker to set the bullet style of the current list: bullets, numbers, letters, or none.',
  multicursor: false,
  hideFromHelp: true,
  hideFromDesktopCommandUniverse: true,
  svg: BulletStyleWithPicker,
  exec: (dispatch, getState) => {
    const state = getState()
    if (!state.cursor || isRoot(state.cursor)) return

    // Toggle the bullet picker dropdown
    dispatch(toggleDropdown({ dropDownType: 'bulletPicker' }))
  },
  isActive: state => {
    if (!state.cursor || isRoot(state.cursor)) return false
    const simplePath = simplifyPath(state, rootedParentOf(state, state.cursor))
    return getBulletStyle(state, head(simplePath)) !== null
  },
  isDropdownOpen: state => !!state.showBulletPicker,
}

export default toggleBulletPickerCommand
