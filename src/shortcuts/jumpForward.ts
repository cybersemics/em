import Shortcut from '../@types/Shortcut'
import { jumpActionCreator as jump } from '../actions/jump'
import SettingsIcon from '../components/icons/SettingsIcon'

const jumpForwardShortcut: Shortcut = {
  id: 'jumpForward',
  label: 'Jump Forward',
  description: 'Move the cursor to the next edit point. Reverses jump back.',
  keyboard: { key: 'j', shift: true, meta: true },
  gesture: 'rur',
  multicursor: 'ignore',
  // TODO: Create unique icon
  svg: SettingsIcon,
  exec: (dispatch, getState) => {
    dispatch(jump(1))
  },
}

export default jumpForwardShortcut
