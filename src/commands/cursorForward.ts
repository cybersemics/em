import Command from '../@types/Command'
import { cursorForwardActionCreator as cursorForward } from '../actions/cursorForward'
import CursorForwardIcon from '../components/icons/CursorForwardIcon'

const cursorForwardCommand: Command = {
  id: 'cursorForward',
  description: 'Move the cursor down a level.',
  hideAlert: true,
  label: 'Forward',
  multicursor: false,
  gesture: 'l',
  svg: CursorForwardIcon,
  exec: dispatch => dispatch(cursorForward()),
}

export default cursorForwardCommand
