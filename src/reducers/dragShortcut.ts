import _ from 'lodash'
import ShortcutId from '../@types/ShortcutId'
import State from '../@types/State'
import { AlertText, AlertType } from '../constants'
import alert from './alert'

/** Reducer for highlighting a bullet on click and hold. */
const dragShortcut = (state: State, { shortcutId }: { shortcutId: ShortcutId | null }) => ({
  ...alert(state, {
    alertType: AlertType.DragAndDropToolbarHint,
    showCloseLink: false,
    value: shortcutId ? AlertText.DragAndDropToolbar : null,
  }),
  dragShortcut: shortcutId,
})

export default _.curryRight(dragShortcut)
