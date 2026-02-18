import Command from '../@types/Command'
import { addAllMulticursorActionCreator as addAllMulticursor } from '../actions/addAllMulticursor'
import { clearMulticursorsActionCreator as clearMulticursors } from '../actions/clearMulticursors'
import { isTouch } from '../browser'
import hasMulticursor from '../selectors/hasMulticursor'
import isAllSelected from '../selectors/isAllSelected'
import isDocumentEditable from '../util/isDocumentEditable'

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
  // Allow chaining Select All into multicursor commands without lifting the finger.
  // Unfortunately categorize is a special case since it has multicursor: false but can still handle multicursor in the action.
  isChainable: command =>
    !!command.gesture && command.id !== 'clearThought' && (!!command.multicursor || command.id === 'categorize'),
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
  exec: (dispatch, getState, e) => {
    // Toggle between Select All and Deselect All
    // i.e. If all thoughts at the current level are selected, clear the multicursor instead.
    // Only Deselect All on mobile, since desktop has Escape to easily deselect all.
    dispatch(
      isTouch && isAllSelected(getState())
        ? clearMulticursors()
        : addAllMulticursor({
            // Hacky magic value, but it's the easiest way to tell the command that this is a chained gesture so that it can adjust the undo behavior.
            // Select All and the chained command need to be undone together, and this is not a property of the Command object but of the way it is invoked, so is somewhat appropriately stored on the event object, albeit ad hoc.
            mergeUndo: e.type === 'chainedGesture',
          }),
    )
  },
}

export default selectAllCommand
