import Shortcut from '../@types/Shortcut'
import { jumpActionCreator as jump } from '../actions/jump'

const jumpBackShortcut: Shortcut = {
  id: 'jumpBack',
  label: 'Jump Back',
  description: 'Move the cursor to the last thought that was edited.',
  keyboard: { key: 'j', meta: true },
  gesture: 'lul',
  exec: (dispatch, getState) => {
    dispatch(jump(-1))
  },
}

export default jumpBackShortcut
