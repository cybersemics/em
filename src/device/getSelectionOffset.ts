/** Returns the character offset of the active selection. */
const getSelectionOffset = () => window.getSelection()?.focusOffset

export default getSelectionOffset
