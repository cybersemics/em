import Shortcut from '../@types/Shortcut'
import fontSizeUp from '../actions/fontSizeUp'

const fontSizeUpShortcut: Shortcut = {
  id: 'fontSizeUp',
  label: 'Increase Font Size',
  description: 'Increase the font size. Bigger is better!',
  exec: dispatch => {
    dispatch(fontSizeUp())
  },
}

export default fontSizeUpShortcut
