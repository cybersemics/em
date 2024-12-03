import _ from 'lodash'
import CommandId from '../@types/CommandId'
import State from '../@types/State'
import Thunk from '../@types/Thunk'
import { alertActionCreator as alert } from '../actions/alert'
import { AlertText, AlertType } from '../constants'

/** Reducer for dragging a shortcut in the customizeToolbar modal. */
const dragShortcut = (state: State, { shortcutId }: { shortcutId: CommandId | null }) => ({
  ...state,
  dragShortcut: shortcutId,
  ...(!shortcutId ? { dragShortcutZone: null } : null),
})

/** Action-creator for dragShortcut. */
export const dragShortcutActionCreator =
  (shortcutId: CommandId | null): Thunk =>
  (dispatch, getState) => {
    const state = getState()
    const alertType = state.alert?.alertType
    const toolbarRect = document.getElementById('toolbar')?.getBoundingClientRect()
    const toolbarTop = toolbarRect?.top ?? 0
    const toolbarHeight = toolbarRect?.height ?? 0

    dispatch([
      // do not show the alert if the alert would cover the sticky toolbar
      shortcutId && toolbarTop >= toolbarHeight
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

export default _.curryRight(dragShortcut)
