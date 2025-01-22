import Command from '../@types/Command'
import { commandPaletteActionCreator as commandPalette } from '../actions/commandPalette'
import CommandPaletteIcon from '../components/icons/CommandPaletteIcon'

const commandPaletteCommand: Command = {
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

export default commandPaletteCommand
