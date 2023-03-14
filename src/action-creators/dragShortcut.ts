import ShortcutId from '../@types/ShortcutId'
import Thunk from '../@types/Thunk'

/** Action-creator for dragShortcut. */
const dragShortcutActionCreator =
  (shortcutId: ShortcutId | null): Thunk =>
  dispatch =>
    dispatch({ type: 'dragShortcut', shortcutId })

export default dragShortcutActionCreator
