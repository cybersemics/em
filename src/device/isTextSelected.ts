/** Returns true if the browser selection is on a text node. */
const isTextSelected = () => window.getSelection()?.focusNode?.nodeType === Node.TEXT_NODE

export default isTextSelected
