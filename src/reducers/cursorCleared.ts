import State from '../@types/State'

/**
 * Sets state.cursorCleared which controls a special state in which the cursor is rendered as an empty string. In this state the thought can be deleted or edited, but if the user navigates away the thought is restored to its previous value.
 */
const cursorCleared = (state: State, { value }: { value: boolean }): State => ({
  ...state,
  cursorCleared: value,
  // ContentEditable does not re-render while editing
  // Use editableNonce to force re-render
  // otherwise clearThought will not work after editing a thought
  editableNonce: state.editableNonce + 1,
  // manually set edit mode to true since the cursor is not changing and normally setCursor handles this
  editing: true,
})

export default cursorCleared
