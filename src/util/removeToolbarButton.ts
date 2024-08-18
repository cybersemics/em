import ShortcutId from '../@types/ShortcutId'
import { alertActionCreator as alert } from '../actions/alert'
import { deleteThoughtActionCreator as deleteThought } from '../actions/deleteThought'
import { initUserToolbarActionCreator } from '../actions/initUserToolbar'
import { AlertType, EM_TOKEN } from '../constants'
import contextToPath from '../selectors/contextToPath'
import findDescendant from '../selectors/findDescendant'
import { getChildrenRanked } from '../selectors/getChildren'
import { shortcutById } from '../shortcuts'
import store from '../stores/app'

/** Removes a toolbar button. */
const removeToolbarButton = (shortcutId: ShortcutId) => {
  const shortcut = shortcutById(shortcutId)

  // initialize EM/Settings/Toolbar/Visible with default shortcuts
  store.dispatch(initUserToolbarActionCreator())
  const state = store.getState()
  const userToolbarThoughtId = findDescendant(state, EM_TOKEN, ['Settings', 'Toolbar'])
  const userShortcutChildren = getChildrenRanked(store.getState(), userToolbarThoughtId)
  const userShortcutIds = userShortcutChildren.map(subthought => subthought.value)

  // user shortcuts must exist since it was created above
  const userShortcutsPath = contextToPath(store.getState(), [EM_TOKEN, 'Settings', 'Toolbar'])!
  const fromIndex = userShortcutIds.indexOf(shortcutId)
  if (fromIndex === -1) return
  const fromThoughtId = userShortcutChildren[fromIndex].id

  store.dispatch([
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

export default removeToolbarButton
