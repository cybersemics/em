import Shortcut from '../@types/Shortcut'
import fontSizeUp from '../actions/fontSizeUp'
import SettingsIcon from '../components/icons/SettingsIcon'

const fontSizeUpShortcut: Shortcut = {
  id: 'fontSizeUp',
  label: 'Increase Font Size',
  description: 'Increase the font size. Bigger is better!',
  // TODO: Create unique icon
  svg: SettingsIcon,
  exec: dispatch => {
    dispatch(fontSizeUp())
  },
}

export default fontSizeUpShortcut
