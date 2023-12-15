/* eslint-disable prefer-const */
import ThoughtId from './@types/ThoughtId'

/** THE BAD PLACE where mutable globals are defined. */

// globally tracks when a long press starts and ends
// this is useful to prevent long-tap-to-select on mobile safari
let longpressing = false

// track whether the user is touchmoving so that we can distinguish touchend events from tap or drag
// not related to react-dnd
let touching = false

// track complete touch event in order to prevent react-dnd from initiating drag during scroll on first page load
let touched = false

// track whether the page has rendered yet to simulate onload event
let rendered = false

// Set to offline mode OFFLINE_TIMEOUT milliseconds after startup. Cancelled with successful login.
let offlineTimer = 0

// Clear error ERROR_TIMEOUT milliseconds after firing. Cancelled if closed manually.
let errorTimer = 0

// A back channel to add thoughts to the freeThought preserve set. Used to prevent freeThoughts from deallocating the import target during import, and the parent docKey during export.
let preserveSet = new Set<ThoughtId>()

/** On cursorNext and cursorPrev, momentarily suppress expansion of children. This avoids performance issues when desktop users hold ArrowDown or ArrowUp to move across many siblings. */
let suppressExpansion = false // eslint-disable-line prefer-const

/** These aren's so bad. They're for debugging. */

// show all drop-hover elements for debugging
// as if hovering over all elements at once
const simulateDrag = false

// show all drop targets with color blocking for debugging
const simulateDrop = false

// disable the tutorial for debugging
const disableTutorial = false

// Use autoincrement ids for Thoughts and normalize values without hashing for Lexemes to make debugging easier.
// Autoincrement ids are not globally unique and will conflict with multilpe devices, so only use for debugging purposes.
const debugIds = false

// Ellipsize the thoughts in the context view. They can be expanded by clicking on the ellipsis.
// TODO: Default to false but add a setting to enable.
const ellipsizeContextThoughts = false

// check duplicate ranks within the same context for debugging
// React prints a warning, but it does not show which thoughts are colliding
const checkDuplicateRanks = false

const globals = {
  checkDuplicateRanks,
  debugIds,
  disableTutorial,
  ellipsizeContextThoughts,
  errorTimer,
  offlineTimer,
  preserveSet,
  longpressing,
  rendered,
  simulateDrag,
  simulateDrop,
  suppressExpansion,
  touched,
  touching,
}

export default globals
