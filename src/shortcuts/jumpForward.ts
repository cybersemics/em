import Shortcut from '../@types/Shortcut'
import { jumpActionCreator as jump } from '../actions/jump'

const jumpForwardShortcut: Shortcut = {
  id: 'jumpForward',
  label: 'Jump Forward',
  description: 'Move the cursor to the next edit point. Reverses jump back.',
  keyboard: { key: 'j', shift: true, meta: true },
  gesture: 'rur',
  exec: (dispatch, getState) => {
    dispatch(jump(1))
  },
}

export default jumpForwardShortcut
