import State from '../@types/State'
import * as selection from '../device/selection'
import isMulticursorPath from './isMulticursorPath'
import parentContextId from './parentContextId'

/** Returns true if a multiselection is being edited, i.e. the real caret is in the cursor thought and the cursor is one
 * of the selected thoughts. This is the state entered by Clear Thought on a multiselection: the real caret is on the
 * first selected thought, a faux caret is rendered on the others, and typed edits are mirrored across all of them.
 * Commands that would otherwise hijack an ordinary editing keystroke defer to the browser in this state, e.g. Backspace
 * within the text deletes a character and Select All selects the text rather than the thoughts.
 *
 * The caret is checked against the cursor thought specifically, not just any thought: Shift + ArrowUp/ArrowDown extends
 * a multiselection while leaving the caret behind in the thought the selection started from, and only clears it on the
 * next animation frame. Accepting the caret in any thought would classify that ordinary multiselection as an edited one
 * until the frame lands, so a command dispatched within it would defer to the browser, e.g. Escape would fail to clear
 * the multiselection. */
const isMultiEditing = (state: State): boolean =>
  !!state.isKeyboardOpen &&
  !!state.cursor &&
  isMulticursorPath(state, state.cursor) &&
  selection.isOnEditable(parentContextId(state, state.cursor))

export default isMultiEditing
