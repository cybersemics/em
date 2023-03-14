import ShortcutId from '../@types/ShortcutId'
import Thunk from '../@types/Thunk'
import { AlertText, AlertType } from '../constants'
import alert from './alert'

/** Action-creator for dragShortcut. */
const dragShortcutActionCreator =
  (shortcutId: ShortcutId | null): Thunk =>
  dispatch => {
    // do not show the alert if the toolbar is within 50px of the top of screen, otherwise it blocks the toolbar
    const toolbarTop = (shortcutId && document.querySelector('.toolbar')?.getBoundingClientRect().top) || 0
    dispatch([
      alert(shortcutId && toolbarTop >= 50 ? AlertText.DragAndDropToolbar : null, {
        alertType: AlertType.DragAndDropToolbarHint,
        showCloseLink: false,
      }),
      { type: 'dragShortcut', shortcutId },
    ])
  }

export default dragShortcutActionCreator
