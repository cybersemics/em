import Shortcut from '../@types/Shortcut'
import { cursorBackActionCreator as cursorBack } from '../actions/cursorBack'
import BackIcon from '../components/icons/BackIcon'
import * as selection from '../device/selection'
import throttleByAnimationFrame from '../util/throttleByAnimationFrame'

const cursorBackShortcut: Shortcut = {
  id: 'cursorBack',
  label: 'Back',
  description: 'Move the cursor up a level.',
  gesture: 'r',
  svg: BackIcon,
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
