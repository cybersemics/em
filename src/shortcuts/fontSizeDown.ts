import Shortcut from '../@types/Shortcut'
import fontSizeDown from '../actions/fontSizeDown'

const fontSizeDownShortcut: Shortcut = {
  id: 'fontSizeDown',
  label: 'Decrease Font Size',
  description: 'Decrease the font size. Get your reading glasses.',
  exec: dispatch => {
    dispatch(fontSizeDown())
  },
}

export default fontSizeDownShortcut
