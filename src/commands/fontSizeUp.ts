import Command from '../@types/Command'
import fontSizeUp from '../actions/fontSizeUp'
import SettingsIcon from '../components/icons/SettingsIcon'

const fontSizeUpCommand: Command = {
  id: 'fontSizeUp',
  label: 'Increase Font Size',
  description: 'Increase the font size. Bigger is better!',
  multicursor: false,
  // TODO: Create unique icon
  svg: SettingsIcon,
  exec: dispatch => {
    dispatch(fontSizeUp())
  },
}

export default fontSizeUpCommand
