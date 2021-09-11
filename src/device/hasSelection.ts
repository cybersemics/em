/** Returns true if there is an active selection. */
const hasSelection = () => !!window.getSelection()?.focusNode

export default hasSelection
