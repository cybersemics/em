import Command from '../@types/Command'
import { openGestureCheatsheetActionCreator as openGestureCheatsheet } from '../actions/openGestureCheatsheet'
import GestureCheatsheetIcon from '../components/icons/GestureCheatsheetIcon'
import scrollTo from '../device/scrollTo'
import isDocumentEditable from '../util/isDocumentEditable'

/**
 * Executes the openGestureCheatsheet command.
 */
const exec: Command['exec'] = dispatch => {
  dispatch(openGestureCheatsheet())
  scrollTo('top')
}

const openGestureCheatsheetCommand: Command = {
  id: 'openGestureCheatsheet',
  label: 'Open Gesture Cheatsheet',
  description: 'Opens the gesture cheatsheet.',
  keyboard: { key: 'h', shift: true },
  gesture: 'rdldr',
  multicursor: true,
  svg: GestureCheatsheetIcon,
  canExecute: () => isDocumentEditable(),
  exec,
}

// Add aliases for the gesture command
export const openGestureCheatsheetAliases: Command = {
  id: 'openGestureCheatsheetAliases',
  label: 'Open Gesture Cheatsheet',
  hideFromHelp: true,
  gesture: ['rdldl', 'rdldld', 'rldld', 'rldldl'], // Add alternative gestures
  multicursor: true,
  svg: GestureCheatsheetIcon,
  canExecute: () => isDocumentEditable(),
  exec,
}

export default openGestureCheatsheetCommand
