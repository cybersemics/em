import Shortcut from '../@types/Shortcut'
import jump from '../action-creators/jump'

const jumpShortcut: Shortcut = {
  id: 'jump',
  label: 'Jump Back',
  description: 'Move the cursor to the last thought that was edited.',
  keyboard: { key: 'j', meta: true },
  gesture: 'lul',
  exec: (dispatch, getState) => {
    dispatch(jump())
  },
}

export default jumpShortcut
