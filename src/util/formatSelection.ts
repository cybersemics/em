import State from '../@types/State'
import * as selection from '../device/selection'
import pathToThought from '../selectors/pathToThought'

/** Emphasize a selection or entire thought.
 * To be used inside shortcuts of bold/italics/underline.
 */
const formatSelection = (state: State, command: 'bold' | 'italic' | 'underline'): void => {
  if (!state.cursor) return

  const thought = pathToThought(state, state.cursor)

  const sel = getSelection()

  if ((sel?.toString() ?? '').length === 0 && thought.value.length !== 0) {
    const thoughtContentEditable = document.querySelector('.editable-' + thought.id)
    if (thoughtContentEditable) {
      const savedCursorPosition = selection.save()

      // Select Entire Thought Contents
      sel?.selectAllChildren(thoughtContentEditable)

      document.execCommand(command)

      sel?.removeAllRanges()
      selection.restore(savedCursorPosition)
    }
  } else {
    document.execCommand(command)
  }
}

export default formatSelection
