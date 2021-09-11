/** Returns true if the selection is on a thought. */
// We should see if it is possible to just use state.editing and hasSelection()
const isEditingThought = () => window.getSelection()?.focusNode?.parentElement?.classList.contains('editable')

export default isEditingThought
