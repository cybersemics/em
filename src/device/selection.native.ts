// TODO: Not implemented

/** Clears the selection. */
export const clear = (): void => {
  // not implemented
}

/** Returns true if there is an active selection. */
export const isActive = () => true

/** Returns true if the selection is a collapsed caret, i.e. the beginning and end of the selection are the same. */
export const isCollapsed = isActive

/** Returns true if text is selected. Not relevant on React Native, so just return true if there is any selection at all. See selection.ts for web implementation. */
export const isText = () => true

/** Returns the character offset of the active selection. */
export const offset = () => 0

/** Returns the character offset at the start of the selection. Returns null if there is no selection. */
export const offsetStart = () => (isActive() ? 0 : null)

/** Returns the character offset at the end of the selection. Returns null if there is no selection. */
export const offsetEnd = () => (isActive() ? 0 : null)
