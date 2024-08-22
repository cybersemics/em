import ShortcutId from '../@types/ShortcutId'
import Thunk from '../@types/Thunk'
import { alertActionCreator as alert } from '../actions/alert'
import { deleteThoughtActionCreator as deleteThought } from '../actions/deleteThought'
import { initUserToolbarActionCreator } from '../actions/initUserToolbar'
import { AlertType, EM_TOKEN } from '../constants'
import contextToPath from '../selectors/contextToPath'
import findDescendant from '../selectors/findDescendant'
import { getChildrenRanked } from '../selectors/getChildren'
import { shortcutById } from '../shortcuts'

/** Removes a toolbar button. */
export const removeToolbarButtonActionCreator =
  (shortcutId: ShortcutId): Thunk =>
  (dispatch, getState) => {
    const shortcut = shortcutById(shortcutId)

    // initialize EM/Settings/Toolbar/Visible with default shortcuts
    dispatch(initUserToolbarActionCreator())
    const state = getState()
    const userToolbarThoughtId = findDescendant(state, EM_TOKEN, ['Settings', 'Toolbar'])
    const userShortcutChildren = getChildrenRanked(getState(), userToolbarThoughtId)
    const userShortcutIds = userShortcutChildren.map(subthought => subthought.value)

    // user shortcuts must exist since it was created above
    const userShortcutsPath = contextToPath(getState(), [EM_TOKEN, 'Settings', 'Toolbar'])!
    const fromIndex = userShortcutIds.indexOf(shortcutId)
    if (fromIndex === -1) return
    const fromThoughtId = userShortcutChildren[fromIndex].id

    dispatch([
      alert(`Removed ${shortcut.label} from toolbar`, {
        alertType: AlertType.ToolbarButtonRemoved,
        clearDelay: 5000,
      }),
      deleteThought({
        thoughtId: fromThoughtId,
        pathParent: userShortcutsPath,
      }),
    ])
  }
