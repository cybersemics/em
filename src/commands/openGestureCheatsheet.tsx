import Command from '../@types/Command'
import { toggleGestureCheatsheetActionCreator } from '../actions/toggleGestureCheatsheet'
import GestureCheatsheetIcon from '../components/icons/GestureCheatsheetIcon'
import isDocumentEditable from '../util/isDocumentEditable'

/**
 * Execute the openGestureCheatsheet command by calling the
 * toggleGestureCheatsheetActionCreator.
 */
const exec: Command['exec'] = dispatch => {
  dispatch(toggleGestureCheatsheetActionCreator({ value: true }))
}

const openGestureCheatsheetCommand: Command = {
  id: 'openGestureCheatsheet',
  label: 'Gesture Cheatsheet',
  description: 'Opens a list of all the gestures.',
  gesture: 'rdld',
  multicursor: false,
  svg: GestureCheatsheetIcon,
  canExecute: () => isDocumentEditable(),
  exec,
}

export default openGestureCheatsheetCommand
