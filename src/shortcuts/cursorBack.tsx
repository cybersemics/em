import Shortcut from '../@types/Shortcut'
import { cursorBackActionCreator as cursorBack } from '../actions/cursorBack'
import Icon from '../components/icons/BackIcon'
import * as selection from '../device/selection'
// import directly since util/index is not loaded yet when shortcut is initialized
import throttleByAnimationFrame from '../util/throttleByAnimationFrame'

const cursorBackShortcut: Shortcut = {
  id: 'cursorBack',
  description: 'Move the cursor up a level.',
  label: 'Back',
  gesture: 'r',
  svg: Icon,
  keyboard: 'Escape',
  exec: throttleByAnimationFrame((dispatch, getState) => {
    const { cursor, search } = getState()
    if (cursor || search != null) {
      dispatch(cursorBack())

      // clear browser selection if cursor has been removed
      const { cursor: cursorNew } = getState()
      if (!cursorNew) {
        selection.clear()
      }
    }
  }),
}

export default cursorBackShortcut
