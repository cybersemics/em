import Command from '../@types/Command'
import { toggleGestureCheatsheetActionCreator } from '../actions/toggleGestureCheatsheet'
import GestureCheatsheetIcon from '../components/icons/GestureCheatsheetIcon'
import scrollTo from '../device/scrollTo'
import isDocumentEditable from '../util/isDocumentEditable'

/**
 * Executes the openGestureCheatsheet command.
 */
const exec: Command['exec'] = dispatch => {
  dispatch(toggleGestureCheatsheetActionCreator({ value: true }))
  scrollTo('top')
}

const openGestureCheatsheetCommand: Command = {
  id: 'openGestureCheatsheet',
  label: 'Gesture Cheatsheet',
  description: 'Opens a list of all the gestures.',
  gesture: 'rdld',
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
