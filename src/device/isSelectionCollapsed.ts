/** Returns true if the selection is a collapsed caret, i.e. the beginning and end of the selection are the same. */
const isSelectionCollapsed = () => window.getSelection()?.isCollapsed

export default isSelectionCollapsed
