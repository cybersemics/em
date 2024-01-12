import ShortcutId from '../@types/ShortcutId'
import Thunk from '../@types/Thunk'
import { AlertText, AlertType } from '../constants'
import { alertActionCreator as alert } from '../reducers/alert'

/** Action-creator for dragShortcut. */
const dragShortcutActionCreator =
  (shortcutId: ShortcutId | null): Thunk =>
  (dispatch, getState) => {
    const state = getState()
    const alertType = state.alert?.alertType
    // get the screen-relative y coordinate of the toolbar
    const toolbarTop = (shortcutId && document.querySelector('.toolbar')?.getBoundingClientRect().top) || 0

    dispatch([
      // do not show the alert if the toolbar is within 50px of the top of screen, otherwise it blocks the toolbar
      shortcutId && toolbarTop >= 50
        ? alert(AlertText.DragAndDropToolbar, {
            alertType: AlertType.DragAndDropToolbarHint,
            showCloseLink: false,
          })
        : alertType === AlertType.ToolbarButtonRemoveHint ||
            alertType === AlertType.DragAndDropToolbarAdd ||
            alertType === AlertType.DragAndDropToolbarHint
          ? alert(null)
          : null,
      { type: 'dragShortcut', shortcutId },
    ])
  }

export default dragShortcutActionCreator
