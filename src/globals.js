/* eslint-disable fp/no-let */

/** THE BAD PLACE where mutable globals are defined. */

import * as localForage from 'localforage'

// allow editable onFocus to be disabled temporarily
// this allows the selection to be re-applied after the onFocus event changes without entering an infinite focus loop
// this would not be a problem if the node was not re-rendered on state change
let disableOnFocus = false // eslint-disable-line prefer-const

// holds the timeout that waits for a certain amount of time after an edit before showing the newChild and superscript helpers
let newChildHelperTimeout
let superscriptHelperTimeout

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

/** These aren's so bad. They're for debugging. */

// simulate dragging and hovering over all drop targets for debugging
const simulateDrag = false
const simulateDropHover = false

// disable the tutorial for debugging
const disableTutorial = false

// disable key hashing for easier debugging of data and contextChildren
const disableThoughtHashing = false

// Ellipsize the thoughts in the context view. They can be expanded by clicking on the ellipsis.
// TODO: Default to false but add a setting to enable.
const ellipsizeContextItems = false

window.localForage = localForage

export default {
  disableThoughtHashing,
  disableOnFocus,
  disableTutorial,
  ellipsizeContextItems,
  errorTimer,
  newChildHelperTimeout,
  offlineTimer,
  rendered,
  simulateDrag,
  simulateDropHover,
  superscriptHelperTimeout,
  touched,
  touching,
}
