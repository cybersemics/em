import Shortcut from '../@types/Shortcut'
import { scaleFontDown } from '../actions/scaleSize'

const fontSizeDownShortcut: Shortcut = {
  id: 'fontSizeDown',
  label: 'Decrease Font Size',
  description: 'Decrease the font size. Get your reading glasses.',
  exec: dispatch => {
    dispatch(scaleFontDown())
  },
}

export default fontSizeDownShortcut
