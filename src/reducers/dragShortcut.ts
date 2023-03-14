import _ from 'lodash'
import ShortcutId from '../@types/ShortcutId'
import State from '../@types/State'

/** Reducer for dragging a shortcut in the customizeToolbar modal. */
const dragShortcut = (state: State, { shortcutId }: { shortcutId: ShortcutId | null }) => ({
  ...state,
  dragShortcut: shortcutId,
})

export default _.curryRight(dragShortcut)
