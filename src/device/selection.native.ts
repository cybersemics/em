// TODO: Not implemented

type SelectionOptionsType = {
  offset?: number
  end?: boolean
}

/** Clears the selection. */
export const clear = (): void => {
  // not implemented
}

/** Returns true if there is an active selection. */
export const isActive = () => true

/** Returns true if the selection is a collapsed caret, i.e. the beginning and end of the selection are the same. */
export const isCollapsed = isActive

/** Returns true if the selection is not on the first line of a multi-line text node. Returns true if there is no selection or if the text node is only a single line. */
export const isOnFirstLine = () => true

/** Returns true if the selection is on the last line of its content. Returns true if there is no selection or if the text is a single line. */
export const isOnLastLine = () => true

/** Returns true if the selection is on a thought. */
export const isThought = isActive

/** Returns true if text is selected. Not relevant on React Native, so just return true if there is any selection at all. See selection.ts for web implementation. */
export const isText = () => true

/** Returns the character offset of the active selection. */
export const offset = () => 0

/** Returns the character offset at the start of the selection. Returns null if there is no selection. */
export const offsetStart = () => (isActive() ? 0 : null)

/** Returns the character offset at the end of the selection. Returns null if there is no selection. */
export const offsetEnd = () => (isActive() ? 0 : null)

/** Restores the selection with the given restoration object (returned by selection.save). NOOP if the restoration object is null or undefined. */
export const restore = () => {
  // not implemented
}

/** Returns an object representing the current selection that can be passed to selection.restore to restore the selection. */
export const save = () => {
  // not implemented
}

/** Set the selection at the desired offset on the given node. Inserts empty text node when element has no children.
 * NOTE: asyncFocus() needs to be called on mobile before set and before any asynchronous effects that call set.
 *
  @param node      The node to set the selection on.
  @param offset    Character offset of the selection relative to the plain text content, i.e. ignoring nested HTML.
  @param end       If true, sets the offset to the end of the text.
 */
export const set = (
  node: Node | null,
  { offset = 0, end = false }: SelectionOptionsType = { offset: 0, end: false },
) => {
  // not implemented
}

/**
 * Returns the HTML before and after selection. If splitting within an element, restores missing tags. e.g. <b>ap|ple/b> -> { left: '<b>ap</b>', right: '<b>ple</b>' }. Return null if there is no selection or the element is not valid.
 */
export const split = (el: HTMLElement) => null

/** Returns the selection text, or null if there is no selection. */
export const text = () => ''
