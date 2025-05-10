import Command from '../@types/Command'
import State from '../@types/State'
import { addAllMulticursorActionCreator as addAllMulticursor } from '../actions/addAllMulticursor'
import { clearMulticursorsActionCreator as clearMulticursors } from '../actions/clearMulticursors'
import { isTouch } from '../browser'
import { HOME_TOKEN } from '../constants'
import getChildren from '../selectors/getChildren'
import hasMulticursor from '../selectors/hasMulticursor'
import rootedParentOf from '../selectors/rootedParentOf'
import head from '../util/head'
import isDocumentEditable from '../util/isDocumentEditable'

/** Returns true if the cursor and all its siblings are selected in the multicursor. */
const isAllSelected = (state: State) => {
  const { cursor } = state
  const parentId = cursor ? head(rootedParentOf(state, cursor)) : HOME_TOKEN
  const childrenIds = getChildren(state, parentId).map(child => child.id)
  // ignore order
  const multicursorIdSet = new Set(Object.values(state.multicursors).map(path => head(path)))
  return childrenIds.length === multicursorIdSet.size && childrenIds.every(childId => multicursorIdSet.has(childId))
}

const selectAllCommand: Command = {
  id: 'selectAll',
  label: 'Select All',
  labelInverse: 'Deselect All',
  description: 'Selects all thoughts at the current level. May reduce wrist strain.',
  descriptionInverse: 'Deselects all thoughts at the current level.',
  gesture: 'ldr',
  // meta + alt + a is the default keyboard shortcut and always works.
  // meta + a is conditionally active when multicursor is active
  keyboard: [
    { key: 'a', meta: true, alt: true },
    { key: 'a', meta: true },
  ],
  multicursor: false,
  isActive: isAllSelected,
  canExecute: state => {
    if (!isDocumentEditable()) {
      return false
    }

    // Check which keyboard shortcut was used
    // If we're using meta+a, only allow it when multicursor is active
    // If we're using meta+alt+a, always allow it
    const e = window.event as KeyboardEvent
    if (e && e.key === 'a' && e.metaKey && !e.altKey) {
      return hasMulticursor(state)
    }

    return true
  },
  exec: (dispatch, getState) => {
    // Toggle between Select All and Deselect All
    // i.e. If all thoughts at the current level are selected, clear the multicursor instead.
    // Only Deselect All on mobile, since desktop has Escape to easily deselect all.
    dispatch(isTouch && isAllSelected(getState()) ? clearMulticursors() : addAllMulticursor())
  },
}

export default selectAllCommand
