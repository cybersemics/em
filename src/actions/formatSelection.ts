import Thunk from '../@types/Thunk'
import pathToThought from '../selectors/pathToThought'
import { updateCommandState } from '../stores/commandStateStore'
import suppressFocusStore from '../stores/suppressFocus'

/** Format the browser selection or cursor thought as bold, italic, strikethrough, underline. */
export const formatSelectionActionCreator =
  (command: 'bold' | 'italic' | 'strikethrough' | 'underline' | 'foreColor' | 'backColor', color: string = ''): Thunk =>
  async (dispatch, getState) => {
    const state = getState()
    if (!state.cursor) return

    const thought = pathToThought(state, state.cursor)

    const sel = window.getSelection()
    suppressFocusStore.update(true)

    // if there is no selection, format the entire thought by selecting the whole thought
    if (sel?.toString().length === 0 && thought.value.length !== 0) {
      const thoughtContentEditable = document.querySelector('.editable-' + thought.id)
      if (!thoughtContentEditable) return

      // const savedSelection = selection.save()
      console.log(sel)

      // must suppress focus events in the Editable component, otherwise selecting text will set editing:true on mobile
      sel?.selectAllChildren(thoughtContentEditable)
      document.execCommand(command, false, color)
      sel?.selectAllChildren(thoughtContentEditable)
      // selection.restore(savedSelection)
    } else {
      document.execCommand(command, false, color)
      updateCommandState()
    }

    suppressFocusStore.update(false)
  }
