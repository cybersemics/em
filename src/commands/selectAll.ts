import Command from '../@types/Command'
import { addAllMulticursorActionCreator as addAllMulticursor } from '../actions/addAllMulticursor'
import { clearMulticursorsActionCreator as clearMulticursors } from '../actions/clearMulticursors'
import { isTouch } from '../browser'
import * as selection from '../device/selection'
import hasMulticursor from '../selectors/hasMulticursor'
import isAllSelected from '../selectors/isAllSelected'
import isMultiEditing from '../selectors/isMultiEditing'
import isDocumentEditable from '../util/isDocumentEditable'

const selectAllCommand = {
  id: 'selectAll',
  label: 'Select All' as const,
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
      // While a multiselection is being edited (see Clear Thought), Cmd/Ctrl + A must select the text of the thought
      // being edited, as it does when editing a single thought, rather than re-selecting the thoughts. The explicit
      // Cmd/Ctrl + Option + A shortcut still selects the thoughts. (#4519)
      return hasMulticursor(state) && !isMultiEditing(state)
    }

    return true
  },
  exec: (dispatch, getState, e) => {
    // Toggle between Select All and Deselect All
    // i.e. If all thoughts at the current level are selected, clear the multicursor instead.
    // Only Deselect All on mobile, since desktop has Escape to easily deselect all.
    const isDeselectAll = isTouch && isAllSelected(getState())

    dispatch(
      isDeselectAll
        ? clearMulticursors()
        : addAllMulticursor({
            // Hacky magic value, but it's the easiest way to tell the command that this is a chained gesture so that it can adjust the undo behavior.
            // Select All and the chained command need to be undone together, and this is not a property of the Command object but of the way it is invoked, so is somewhat appropriately stored on the event object, albeit ad hoc.
            mergeNext: e.type === 'chainedGesture',
          }),
    )

    // An ordinary multiselection leaves the caret outside any editable, which is how isMultiEditing tells it apart from
    // a multiselection that is being edited (Clear Thought). Otherwise the caret left behind in the cursor thought makes
    // the selection look edited, and the selection that Copy Cursor saves and restores around the clipboard write
    // re-focuses the editable, rendering a faux caret on every selected thought (#5108). Shift + ArrowUp/ArrowDown takes
    // the caret out of the multiselection the same way (see cursorUp). Cleared after the dispatch so that the Command
    // Center is already open on mobile when the blur arrives, otherwise Editable's onBlur ends the multiselection.
    if (!isDeselectAll) selection.clear()
  },
} satisfies Command

export default selectAllCommand
