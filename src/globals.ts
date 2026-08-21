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

/** Set when a touchend on a non-cursor thought moves the cursor without entering edit mode, and cleared on the next
 * touchstart. While set, any focus or mousedown on an editable is the tail of that same tap: iOS Safari sometimes
 * synthesizes them even though touchend called preventDefault (e.g. a non-cancelable touchend during scroll momentum),
 * and by the time they arrive the tapped thought has already become the cursor, so they would incorrectly activate
 * edit mode. A legitimate second tap always begins with a new touchstart, which clears the flag first. */
let suppressFocusAfterCursorMove = false

/** Set when a thought drag ends and cleared on the next task. While set, an Editable ignores the click synthesized from
 * the drag's release so it cannot move the cursor to the dragged thought after drag cleanup has completed. */
let suppressTapAfterDrag = false

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
  suppressFocusAfterCursorMove,
  suppressTapAfterDrag,
  arrowKeyBoundaryCross: arrowKeyBoundaryCross as string | null,
  touching,
}

export default globals
