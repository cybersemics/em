import Command from '../@types/Command'
import fontSizeDown from '../actions/fontSizeDown'
import SettingsIcon from '../components/icons/SettingsIcon'

const fontSizeDownCommand: Command = {
  id: 'fontSizeDown',
  label: 'Decrease Font Size',
  description: 'Decrease the font size. Get your reading glasses.',
  multicursor: false,
  // TODO: Create unique icon
  svg: SettingsIcon,
  exec: dispatch => {
    dispatch(fontSizeDown())
  },
}

export default fontSizeDownCommand
