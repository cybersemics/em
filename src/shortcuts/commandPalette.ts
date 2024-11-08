import Shortcut from '../@types/Shortcut'
import { commandPaletteActionCreator as commandPalette } from '../actions/commandPalette'
import CommandPaletteIcon from '../components/icons/CommandPaletteIcon'

const commandPaletteShortcut: Shortcut = {
  id: 'commandPalette',
  label: 'Command Palette',
  description: 'Opens the command palette where commands can be executed by name.',
  hideFromCommandPalette: true,
  multicursor: 'ignore',
  svg: CommandPaletteIcon,
  keyboard: { key: 'p', meta: true },
  exec: dispatch => dispatch(commandPalette()),
  allowExecuteFromModal: true,
}

export default commandPaletteShortcut
