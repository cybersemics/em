/* eslint-disable prefer-const */

/** THE BAD PLACE where mutable globals are defined. */

// globally tracks when a long press starts and ends
// this is useful to prevent long-tap-to-select on mobile safari
let longpressing = false

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

/** The maximum size of the thoughtIndex before freeThoughts kicks in to free memory. */
// e.g. Art • Buddhist Art • :: • Regions • China • Period • Era of North-South division • North • East • Northern Qi
// = 455 thoughts loaded into memory
// This is a constant. Override global for testing only.
let freeThoughtsThreshold = 500

/** These aren's so bad. They're for debugging. */

// Ellipsize the thoughts in the context view. They can be expanded by clicking on the ellipsis.
// TODO: Default to false but add a setting to enable.
const ellipsizeContextThoughts = false

/** Escape hatch to abandon imports when frozen. This is a workaround for a bug that has not been resolved. */
let abandonImport = false

// check duplicate ranks within the same context for debugging
const globals = {
  abandonImport,
  ellipsizeContextThoughts,
  freeThoughtsThreshold,
  errorTimer,
  offlineTimer,
  longpressing,
  rendered,
  suppressExpansion,
  touching,
}

export default globals
