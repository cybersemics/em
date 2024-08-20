import Thunk from '../@types/Thunk'
import * as selection from '../device/selection'
import pathToThought from '../selectors/pathToThought'
import { updateCommandState } from '../stores/commandStateStore'
import suppressFocusStore from '../stores/suppressFocus'

/** Format the browser selection or cursor thought as bold, italic, strikethrough, underline. */
export const formatSelectionActionCreator =
  (
    command: 'bold' | 'italic' | 'strikethrough' | 'underline' | 'foreColor' | 'backColor',
    color: string = '#ffffff',
  ): Thunk =>
  (dispatch, getState) => {
    // Apply text and background color to the selected text and apply the command
    const execCommand = () => {
      if (command === 'backColor' || command === 'foreColor') document.execCommand(command, false, color)
      else document.execCommand(command)
    }

    const state = getState()
    if (!state.cursor) return

    const thought = pathToThought(state, state.cursor)

    const sel = window.getSelection()
    suppressFocusStore.update(true)

    // if there is no selection, format the entire thought by selecting the whole thought
    if (sel?.toString().length === 0 && thought.value.length !== 0) {
      const thoughtContentEditable = document.querySelector('.editable-' + thought.id)
      if (!thoughtContentEditable) return

      const savedSelection = selection.save()

      // must suppress focus events in the Editable component, otherwise selecting text will set editing:true on mobile
      sel?.selectAllChildren(thoughtContentEditable)

      execCommand()
      selection.restore(savedSelection)
    } else {
      execCommand()
      updateCommandState()
    }

    suppressFocusStore.update(false)
  }
