import Shortcut from '../@types/Shortcut'
import Icon from '../components/icons/ItalicTextIcon'
import { commandPaletteActionCreator as commandPalette } from '../reducers/commandPalette'

const commandPaletteShortcut: Shortcut = {
  id: 'commandPalette',
  label: 'Command Palette',
  description: 'Opens the command palette where commands can be executed by name.',
  hideFromCommandPalette: true,
  svg: Icon,
  keyboard: { key: 'p', meta: true },
  exec: dispatch => dispatch(commandPalette()),
  allowExecuteFromModal: true,
}

export default commandPaletteShortcut
