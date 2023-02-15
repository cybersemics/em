import Thunk from '../@types/Thunk'
import * as selection from '../device/selection'
import pathToThought from '../selectors/pathToThought'

/** Format the browser selection or cursor thought as bold, italic, strikethrough, underline. */
const formatSelectionActionCreator =
  (command: 'bold' | 'italic' | 'strikethrough' | 'underline'): Thunk =>
  (dispatch, getState) => {
    const state = getState()
    if (!state.cursor) return

    const thought = pathToThought(state, state.cursor)

    const sel = window.getSelection()

    // if there is no selection, format the entire thought by selecting the whole thought
    if (sel?.toString().length === 0 && thought.value.length !== 0) {
      const thoughtContentEditable = document.querySelector('.editable-' + thought.id)
      if (!thoughtContentEditable) return

      const savedSelection = selection.save()

      sel?.selectAllChildren(thoughtContentEditable)

      document.execCommand(command)

      sel?.removeAllRanges()

      // restore selection after the next tick, otherwise during browse mode on mobile the selection is not cleared
      setTimeout(() => {
        selection.restore(savedSelection)
      })
    } else {
      document.execCommand(command)
    }
  }

export default formatSelectionActionCreator
