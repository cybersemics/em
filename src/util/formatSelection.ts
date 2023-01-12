import State from '../@types/State'
import * as selection from '../device/selection'
import pathToThought from '../selectors/pathToThought'

/** Format the browser selection or cursor thought as bold, italic, or underline. */
const formatSelection = (state: State, command: 'bold' | 'italic' | 'underline'): void => {
  if (!state.cursor) return

  const thought = pathToThought(state, state.cursor)

  const sel = getSelection()

  // if there is no selection, format the entire thought by selecting the whole thought
  if ((sel?.toString() ?? '').length === 0 && thought.value.length !== 0) {
    const thoughtContentEditable = document.querySelector('.editable-' + thought.id)
    if (thoughtContentEditable) {
      const savedSelection = selection.save()

      // select entire thought contents
      sel?.selectAllChildren(thoughtContentEditable)

      document.execCommand(command)

      sel?.removeAllRanges()
      selection.restore(savedSelection)
    }
  } else {
    document.execCommand(command)
  }
}

export default formatSelection
