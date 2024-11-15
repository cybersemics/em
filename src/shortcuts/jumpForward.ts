import Shortcut from '../@types/Shortcut'
import { jumpActionCreator as jump } from '../actions/jump'
import JumpForwardIcon from '../components/icons/JumpForwardIcon'

const jumpForwardShortcut: Shortcut = {
  id: 'jumpForward',
  label: 'Jump Forward',
  description: 'Move the cursor to the next edit point. Reverses jump back.',
  keyboard: { key: 'j', shift: true, meta: true },
  gesture: 'rur',
  multicursor: 'ignore',
  svg: JumpForwardIcon,
  exec: dispatch => {
    dispatch(jump(1))
  },
}

export default jumpForwardShortcut
