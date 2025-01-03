/* eslint-disable import/prefer-default-export */
import CommandId from '../@types/CommandId'
import Thunk from '../@types/Thunk'
import { alertActionCreator as alert } from '../actions/alert'
import { deleteThoughtActionCreator as deleteThought } from '../actions/deleteThought'
import { initUserToolbarActionCreator as initUserToolbar } from '../actions/initUserToolbar'
import { commandById } from '../commands'
import { AlertType, EM_TOKEN } from '../constants'
import contextToPath from '../selectors/contextToPath'
import findDescendant from '../selectors/findDescendant'
import { getChildrenRanked } from '../selectors/getChildren'

/** Removes a toolbar button. */
export const removeToolbarButtonActionCreator =
  (shortcutId: CommandId): Thunk =>
  (dispatch, getState) => {
    const shortcut = commandById(shortcutId)

    // initialize EM/Settings/Toolbar/Visible with default shortcuts
    dispatch(initUserToolbar())
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
