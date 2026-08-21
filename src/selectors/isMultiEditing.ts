import State from '../@types/State'
import * as selection from '../device/selection'
import isMulticursorPath from './isMulticursorPath'

/** Returns true if a multiselection is being edited, i.e. the real caret is in the cursor thought and the cursor is one
 * of the selected thoughts. This is the state entered by Clear Thought on a multiselection: the real caret is on the
 * first selected thought, a faux caret is rendered on the others, and typed edits are mirrored across all of them.
 * Commands that would otherwise hijack an ordinary editing keystroke defer to the browser in this state, e.g. Backspace
 * within the text deletes a character and Select All selects the text rather than the thoughts.
 *
 * The browser selection is checked because an ordinary multiselection leaves the caret outside of any thought; only an
 * edited multiselection places it back in one. */
const isMultiEditing = (state: State): boolean =>
  !!state.isKeyboardOpen && !!state.cursor && isMulticursorPath(state, state.cursor) && selection.isThought()

export default isMultiEditing
