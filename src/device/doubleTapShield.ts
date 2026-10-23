import Timer from '../@types/Timer'
import { isSafari, isTouch } from '../browser'
import ministore from '../stores/ministore'
import osVersionStore from '../stores/osVersionStore'
import debugLog from '../util/debugLog'
import * as selection from './selection'

/** How long a tap on the thought being edited stays covered. Covers the second tap of a double tap, which follows the first by as little as 37 ms on a device. */
const DOUBLE_TAP_WINDOW = 350

/** How long after the last covered tap the caret is put back when the selection leaves the thought. A covered tap that iOS commits late selects the nearest text outside the thought, well after the overlay is gone. */
const RESTORE_WINDOW = 1000

/** How far the overlay reaches past the thought, so that a second tap just outside its text is covered too. */
const OVERLAY_PADDING = 20

/** The overlay over the thought being edited, and the caret to put back if a covered tap moves the selection out of it. Disposing removes the overlay and clears its timer. */
const shieldStore = ministore<{
  overlay: HTMLElement | null
  timer: Timer | null
  editable: HTMLElement | null
  caret: selection.SavedSelection | null
  restoreUntil: number
}>(
  { overlay: null, timer: null, editable: null, caret: null, restoreUntil: 0 },
  {
    dispose: ({ overlay, timer }) => {
      overlay?.remove()
      clearTimeout(timer ?? undefined)
    },
  },
)

/** Removes the overlay, leaving the caret armed for the rest of its restore window. */
const uncover = () => {
  shieldStore.getState().overlay?.remove()
  shieldStore.update({ overlay: null, timer: null })
}

/**
 * Covers the thought being edited for the double tap window after a tap on it, so that a second tap lands on the
 * overlay instead of the text. On iOS 27, a double tap on a focused editable draws a word selection, and from then on
 * WebKit withholds the touchend, touchmove and pointerup of every touch that begins within 44pt of the caret, for the
 * life of the tab (#5660, WebKit bug 322561). Nothing the page does afterwards ends that state, so it has to be
 * prevented. WebKit cancels a tap whose target changes before it commits, which also cancels the tap that was just
 * covered, so the caller places its caret before covering.
 */
const cover = (editable: HTMLElement) => {
  shieldStore.reset()

  const rect = editable.getBoundingClientRect()
  const overlay = document.createElement('div')
  Object.assign(overlay.style, {
    position: 'fixed',
    left: `${rect.left - OVERLAY_PADDING}px`,
    top: `${rect.top - OVERLAY_PADDING}px`,
    width: `${rect.width + 2 * OVERLAY_PADDING}px`,
    height: `${rect.height + 2 * OVERLAY_PADDING}px`,
    zIndex: '100000',
    userSelect: 'none',
    webkitUserSelect: 'none',
  })

  overlay.addEventListener(
    'touchstart',
    e => {
      // keeps the focus, and with it the keyboard, on the thought
      e.preventDefault()
      // a triple tap outlasts the window, so each tap on the overlay keeps it up for another
      clearTimeout(shieldStore.getState().timer ?? undefined)
      shieldStore.update({ timer: setTimeout(uncover, DOUBLE_TAP_WINDOW), restoreUntil: e.timeStamp + RESTORE_WINDOW })
      debugLog.log('doubleTapShield', { event: 'tap' })
    },
    { passive: false },
  )
  // the covered tap's own mouse events can land here, after its caret was placed
  overlay.addEventListener('mousedown', e => e.preventDefault())
  document.body.appendChild(overlay)

  shieldStore.update({
    overlay,
    timer: setTimeout(uncover, DOUBLE_TAP_WINDOW),
    editable,
    caret: selection.save(),
    restoreUntil: performance.now() + RESTORE_WINDOW,
  })
  debugLog.log('doubleTapShield', { event: 'cover' })
}

/**
 * Keeps a selection from being drawn in a thought on iOS 27, where any range drawn there starts the same withheld
 * touches as a double tap. Collapses a range in a thought before it is drawn, which catches the edit menu's Select and
 * Select All that no overlay can intercept. Also puts the caret back when a tap on the overlay moved the selection
 * onto text outside the thought. Called first from the selectionchange listener in initEvents.
 */
const onSelectionChange = () => {
  if (!isTouch || !isSafari() || (osVersionStore.getState() ?? 0) < 27) return

  const { editable, caret, restoreUntil } = shieldStore.getState()
  if (
    caret &&
    performance.now() < restoreUntil &&
    document.activeElement === editable &&
    selection.isActive() &&
    !selection.isOnEditable()
  ) {
    selection.restore(caret)
    debugLog.log('doubleTapShield', { event: 'restore' })
    return
  }

  if (!selection.isCollapsed() && selection.isOnEditable()) {
    selection.collapse()
    debugLog.log('doubleTapShield', { event: 'collapse' })
  }
}

const doubleTapShield = { cover, onSelectionChange }

export default doubleTapShield
