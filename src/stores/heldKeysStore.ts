import ministore from './ministore'

/** State that makes a held key behave, read by the global key handlers and by setCursor on every keypress. A ministore rather than mutable globals so that resetStores clears it between tests; nothing subscribes, so a write never renders. */
const heldKeysStore = ministore<{
  /** On cursorNext and cursorPrev, momentarily suppress expansion of children. This avoids performance issues when desktop users hold ArrowDown or ArrowUp to move across many siblings. */
  suppressExpansion: boolean
  /** The arrow key (e.g. 'ArrowLeft' or 'ArrowRight') that just crossed a table column boundary on a discrete keypress. While set, auto-repeat of that key is suppressed so that holding it does not continuously advance the caret into or through the adjacent thought — the key must be released and pressed again to move further. Cleared on keyup. */
  arrowKeyBoundaryCross: string | null
}>({
  suppressExpansion: false,
  arrowKeyBoundaryCross: null,
})

export default heldKeysStore
