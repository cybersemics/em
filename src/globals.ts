/* eslint-disable prefer-const */
import { XYCoord } from 'react-dnd'

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

/** The maximum size of the thoughtIndex before freeThoughts kicks in to free memory. */
// e.g. Art • Buddhist Art • :: • Regions • China • Period • Era of North-South division • North • East • Northern Qi
// = 455 thoughts loaded into memory
// This is a constant. Override global for testing only.
let freeThoughtsThreshold = 500

/** These aren's so bad. They're for debugging. */

/** Escape hatch to abandon imports when frozen. This is a workaround for a bug that has not been resolved. */
let abandonImport = false

/** Store the position where the last expandHoverDown action occurred in order to prevent it from firing again
 * until the pointer position changes (#3278).
 */
let lastHoverDownPosition: XYCoord | null = null

// check duplicate ranks within the same context for debugging
const globals: {
  abandonImport: boolean
  freeThoughtsThreshold: number
  errorTimer: number
  lastHoverDownPosition: XYCoord | null
  offlineTimer: number
  rendered: boolean
  suppressExpansion: boolean
  touching: boolean
} = {
  abandonImport,
  freeThoughtsThreshold,
  errorTimer,
  lastHoverDownPosition,
  offlineTimer,
  rendered,
  suppressExpansion,
  touching,
}

export default globals
