import hasSelection from './hasSelection'

/** Returns true if text is selected. Not relevant on React Native, so just return true if there is any selection at all. See isTextSelected.ts for web implementation. */
const isTextSelected = hasSelection

export default isTextSelected
