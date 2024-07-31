import Shortcut from '../@types/Shortcut'
import { scaleFontUp } from '../actions/scaleSize'

const fontSizeUpShortcut: Shortcut = {
  id: 'fontSizeUp',
  label: 'Increase Font Size',
  description: 'Increase the font size. Bigger is better!',
  exec: dispatch => {
    dispatch(scaleFontUp())
  },
}

export default fontSizeUpShortcut
