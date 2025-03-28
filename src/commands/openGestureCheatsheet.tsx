import Command from '../@types/Command'
import { toggleGestureCheatsheetActionCreator } from '../actions/toggleGestureCheatsheet'
import GestureCheatsheetIcon from '../components/icons/GestureCheatsheetIcon'
import scrollTo from '../device/scrollTo'
import isDocumentEditable from '../util/isDocumentEditable'

/**
 * Execute the openGestureCheatsheet command by calling the
 * toggleGestureCheatsheetActionCreator.
 * We scroll to the top of the page to ensure the cheatsheet is visible.
 * Inside the cheatsheet, we lock the scroll of the page to ensure
 * the cheatsheet is the only element that can be scrolled.
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

export default openGestureCheatsheetCommand
