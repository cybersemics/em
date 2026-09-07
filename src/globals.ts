/* eslint-disable prefer-const */

/** THE BAD PLACE where mutable globals are defined. */

// track whether the user is touchmoving so that we can distinguish touchend events from tap or drag
// not related to react-dnd
let touching = false

// track whether the page has rendered yet to simulate onload event
let rendered = false

// Set to offline mode OFFLINE_TIMEOUT milliseconds after startup. Cancelled with successful login.
let offlineTimer = 0

// Clear error ERROR_TIMEOUT milliseconds after firing. Cancelled if closed manually.
let errorTimer = 0

/** On cursorNext and cursorPrev, momentarily suppress expansion of children. This avoids performance issues when desktop users hold ArrowDown or ArrowUp to move across many siblings. */
let suppressExpansion = false

/** The arrow key (e.g. 'ArrowLeft' or 'ArrowRight') that just crossed a table column boundary on a discrete keypress. While set, auto-repeat of that key is suppressed so that holding it does not continuously advance the caret into or through the adjacent thought — the key must be released and pressed again to move further. Cleared on keyup. */
let arrowKeyBoundaryCross: string | null = null

/** The maximum size of the thoughtIndex before freeThoughts kicks in to free memory. */
// e.g. Art • Buddhist Art • :: • Regions • China • Period • Era of North-South division • North • East • Northern Qi
// = 455 thoughts loaded into memory
// This is a constant. Override global for testing only.
let freeThoughtsThreshold = 500

/** These aren's so bad. They're for debugging. */

/** Escape hatch to abandon imports when frozen. This is a workaround for a bug that has not been resolved. */
let abandonImport = false

/** Used to suppress the Editable change handler to ignore execCommand in registerNativeUndoStep. */
let suppressChange = false

/** Used to suppress the blur handlers that resync the editable's innerHTML to the value in Redux. Set while the
 * editable is momentarily blurred and refocused to retarget focus after iOS autocomplete, which does not end editing. */
let suppressBlurSync = false

/** Set when a completed touch has already handled its intended cursor behavior, and cleared on the next touchstart.
 * While set, cursor-producing events on an editable belong to the completed touch: browsers can synthesize them after
 * touchend called preventDefault, or after drag cleanup has finished. A legitimate tap always begins with a new
 * touchstart, which clears the flag first. */
let suppressCursorAfterTouch = false

// check duplicate ranks within the same context for debugging
const globals = {
  abandonImport,
  freeThoughtsThreshold,
  errorTimer,
  offlineTimer,
  rendered,
  suppressExpansion,
  suppressChange,
  suppressBlurSync,
  suppressCursorAfterTouch,
  arrowKeyBoundaryCross: arrowKeyBoundaryCross as string | null,
  touching,
}

export default globals
