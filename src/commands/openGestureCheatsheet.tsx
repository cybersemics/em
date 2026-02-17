import Command from '../@types/Command'
import { toggleGestureCheatsheetActionCreator as toggleGestureCheatsheet } from '../actions/toggleGestureCheatsheet'
import GestureCheatsheetIcon from '../components/icons/GestureCheatsheetIcon'
import isDocumentEditable from '../util/isDocumentEditable'
import gestures from './gestures'

const openGestureCheatsheetCommand: Command = {
  id: 'openGestureCheatsheet',
  label: 'Gesture Cheatsheet',
  description: 'Opens a list of all the gestures.',
  gesture: gestures.OPEN_GESTURE_CHEATSHEET_GESTURE,
  multicursor: false,
  hideAlert: true,
  svg: GestureCheatsheetIcon,
  canExecute: () => isDocumentEditable(),
  exec: dispatch => {
    dispatch(toggleGestureCheatsheet({ value: true }))
  },
}

export default openGestureCheatsheetCommand
