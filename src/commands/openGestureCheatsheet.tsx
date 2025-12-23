import Command from '../@types/Command'
import { toggleGestureCheatsheetActionCreator as toggleGestureCheatsheet } from '../actions/toggleGestureCheatsheet'
import GestureCheatsheetIcon from '../components/icons/GestureCheatsheetIcon'
import isDocumentEditable from '../util/isDocumentEditable'

const openGestureCheatsheetCommand: Command = {
  id: 'openGestureCheatsheet',
  label: 'Gesture Cheatsheet',
  description: 'Opens a list of all the gestures.',
  gesture: 'rdld',
  multicursor: false,
  hideAlert: true,
  svg: GestureCheatsheetIcon,
  canExecute: () => isDocumentEditable(),
  exec: dispatch => {
    dispatch(toggleGestureCheatsheet({ value: true }))
  },
}

export default openGestureCheatsheetCommand
