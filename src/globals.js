/* eslint-disable fp/no-let */

/** THE BAD PLACE where mutable globals are defined. */

// allow editable onFocus to be disabled temporarily
// this allows the selection to be re-applied after the onFocus event changes without entering an infinite focus loop
// this would not be a problem if the node was not re-rendered on state change
let disableOnFocus = false // eslint-disable-line prefer-const

// track whether the user is touching the screen so that we can distinguish touchend events from tap or drag
// not related to react-dnd
let touching

// track complete touch event in order to prevent react-dnd from initiating drag during scroll on first page load
let touched

// track whether the page has rendered yet to simulate onload event
let rendered

// Set to offline mode OFFLINE_TIMEOUT milliseconds after startup. Cancelled with successful login.
let offlineTimer

// Clear error ERROR_TIMEOUT milliseconds after firing. Cancelled if closed manually.
let errorTimer

/** When the Meta/Control key is held for more than SUPPRESS_EXPANSION_DELAY milliseconds, then subthoughts will not be expanded. It is also immediately activated on cursorNext or cursorPrev. This allows desktop users to navigate siblings easier when they have lots of subthoughts. */
let suppressExpansion = false // eslint-disable-line prefer-const

/** These aren's so bad. They're for debugging. */

// simulate dragging and hovering over all drop targets for debugging
const simulateDrag = false
const simulateDropHover = false

// disable the tutorial for debugging
const disableTutorial = false

// disable key hashing for easier debugging of thoughtIndex and contextIndex
const disableThoughtHashing = false

// Ellipsize the thoughts in the context view. They can be expanded by clicking on the ellipsis.
// TODO: Default to false but add a setting to enable.
const ellipsizeContextThoughts = false

// check duplicate ranks within the same context for debugging
// React prints a warning, but it does not show which thoughts are colliding
const checkDuplicateRanks = false

export default {
  checkDuplicateRanks,
  disableOnFocus,
  disableThoughtHashing,
  disableTutorial,
  ellipsizeContextThoughts,
  errorTimer,
  offlineTimer,
  rendered,
  simulateDrag,
  simulateDropHover,
  suppressExpansion,
  touched,
  touching,
}
