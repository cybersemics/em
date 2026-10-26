import { token } from '../../styled-system/tokens'
import Timer from '../@types/Timer'
import { isIOS, isSafari, isTouch } from '../browser'
import testFlags from '../e2e/testFlags'
import type useDragAndDropThought from '../hooks/useDragAndDropThought'
import type { LongPressProps } from '../hooks/useLongPress'
import osVersionStore from '../stores/osVersionStore'
import reactMinistore from '../stores/react-ministore'
import debugLog from '../util/debugLog'
import getCaretOffset from './getCaretOffset'
import * as selection from './selection'

/** How long a tap on the thought being edited stays covered. Longer than iOS's own double tap interval, which counted two taps 363 ms apart on a device, since a tap on the overlay still counts as the first of a pair. */
const DOUBLE_TAP_WINDOW = 500

/** How long after the last covered tap the caret is put back when the selection leaves the thought. A covered tap that iOS commits late selects the nearest text outside the thought, well after the overlay is gone. */
const RESTORE_WINDOW = 1000

/** How far the overlay reaches past the editable horizontally, so that a second tap just outside its text is covered too. */
const OVERLAY_PADDING_X = 20

/** How far the overlay reaches past the editable vertically. On a device, iOS paired a tap with one on the neighbouring note about ten pixels away, so the neighbours are covered as well. */
const OVERLAY_PADDING_Y = 60

/** The thoughts and notes that a tap on the overlay can be passed to. */
const EDITABLE_SELECTOR = '[data-editable], [aria-label="note-editable"]'

/** How long a press must be held before iOS shows the magnifier, after which it is no longer a tap. */
const MAGNIFIER_DELAY = 500

/** How far a touch can move and still be a tap rather than a gesture, in pixels. Matches MultiGesture's minDistance. */
const TAP_SLOP = 10

/** A point in viewport coordinates. */
type Point = { clientX: number; clientY: number }

/** Whether a touch moved too far between two points to be a tap. */
const moved = (start: Point, end: Point) =>
  Math.hypot(end.clientX - start.clientX, end.clientY - start.clientY) >= TAP_SLOP

/** The overlay over the thought being edited, and the caret to put back if a covered tap moves the selection out of it. Disposing removes the overlay and clears its timer. */
const shieldStore = reactMinistore<{
  overlay: HTMLElement | null
  timer: Timer | null
  editable: HTMLElement | null
  /** The caret's plain-text offset within the editable, which survives a re-render that replaces its text nodes. */
  caret: number | null
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

/** The thoughts that a long press on the overlay can drag, keyed by their element, each with its own drag source spec and long press handlers. Registered by Thought. */
const dragTargets = new WeakMap<
  Element,
  { current: { drag: ReturnType<typeof useDragAndDropThought>['dragSpec']; longPress: LongPressProps } | null }
>()

/** Removes the overlay, leaving the caret armed for the rest of its restore window. */
const uncover = () => {
  shieldStore.getState().overlay?.remove()
  shieldStore.update({ overlay: null, timer: null })
}

/**
 * Covers the editable for the double tap window after a tap on it, so that a second tap lands on the overlay instead
 * of the text. WebKit cancels a tap whose target changes before it commits, which also cancels the tap that was just
 * covered, so the caller has already placed its caret, and placeCaret places it for each tap that lands on the overlay.
 */
const cover = (editable: HTMLElement, placeCaret: (point: Point) => boolean) => {
  shieldStore.reset()

  let touchStart: (Point & { timeStamp: number }) | null = null
  const rect = editable.getBoundingClientRect()
  const overlay = document.createElement('div')
  Object.assign(overlay.style, {
    position: 'fixed',
    left: `${rect.left - OVERLAY_PADDING_X}px`,
    top: `${rect.top - OVERLAY_PADDING_Y}px`,
    width: `${rect.width + 2 * OVERLAY_PADDING_X}px`,
    height: `${rect.height + 2 * OVERLAY_PADDING_Y}px`,
    // below the toolbar, nav bar and footer, which it may reach
    zIndex: token('zIndex.doubleTapShield'),
    userSelect: 'none',
    webkitUserSelect: 'none',
  })

  overlay.addEventListener(
    'touchstart',
    e => {
      // keeps the focus, and with it the keyboard, on the thought
      e.preventDefault()
      const touch = e.changedTouches[0]
      touchStart = touch ? { clientX: touch.clientX, clientY: touch.clientY, timeStamp: e.timeStamp } : null
      // removing the overlay under a finger would send its touchend to a detached node, which nothing hears
      clearTimeout(shieldStore.getState().timer ?? undefined)
      shieldStore.update({ timer: null, restoreUntil: e.timeStamp + RESTORE_WINDOW })
      debugLog.log('doubleTapShield', { event: 'tap' })
    },
    { passive: false },
  )
  /** Keeps the overlay up for another window after each touch on it, which also covers a triple tap. */
  const restartTimer = () => {
    clearTimeout(shieldStore.getState().timer ?? undefined)
    shieldStore.update({ timer: setTimeout(uncover, testFlags.doubleTapWindow ?? DOUBLE_TAP_WINDOW) })
  }
  overlay.addEventListener('touchend', e => {
    // a long press is not a tap, so it cannot start a double tap, and the press the user retries should reach the text
    if (touchStart && e.timeStamp - touchStart.timeStamp >= MAGNIFIER_DELAY) uncover()
    else restartTimer()
    const touch = e.changedTouches[0]
    // a long press that began a drag hold cleared the selection to close the keyboard
    if (!touchStart || !touch || moved(touchStart, touch) || !selection.isActive()) return
    const target = document
      .elementsFromPoint(touch.clientX, touch.clientY)
      .find(el => el !== overlay)
      ?.closest<HTMLElement>(EDITABLE_SELECTOR)
    // a tap over another thought or note goes to it, as it would have without the overlay
    if (target && target !== editable) {
      if (document.activeElement !== target) target.focus({ preventScroll: true })
      const { offset } = getCaretOffset(target, touch)
      if (offset !== null) selection.set(target, { offset })
    } else {
      if (document.activeElement !== editable) editable.focus({ preventScroll: true })
      placeCaret(touch)
    }
    // the caret to put back is now wherever the tap placed it
    const focused = target ?? editable
    shieldStore.update({ editable: focused, caret: selection.offsetFromNode(focused) })
  })
  overlay.addEventListener('touchcancel', restartTimer)
  // the covered tap's own mouse events can land here, after its caret was placed
  overlay.addEventListener('mousedown', e => e.preventDefault())
  // inside MultiGesture, whose responder only hears touches on its descendants, so a swipe that starts here still runs
  const gestureContainer = editable.closest('[data-multigesture]') ?? document.body
  gestureContainer.appendChild(overlay)

  shieldStore.update({
    overlay,
    timer: setTimeout(uncover, testFlags.doubleTapWindow ?? DOUBLE_TAP_WINDOW),
    editable,
    caret: selection.offsetFromNode(editable),
    restoreUntil: performance.now() + RESTORE_WINDOW,
  })
  debugLog.log('doubleTapShield', { event: 'cover' })
}

/**
 * Handles the end of a touch on a thought or note. On iOS 27, a double tap on a focused editable draws a word
 * selection, and from then on WebKit withholds the touchend, touchmove and pointerup of every touch that begins within
 * 44pt of the caret, for the life of the tab (#5660, WebKit bug 322561). Nothing the page does afterwards ends that
 * state, so it has to be prevented. Any tap on the editable being edited may be the first of a double tap, so it places
 * its own caret with placeCaret, which returns false to leave the tap alone, and the editable is covered so that the
 * second tap lands off the text. A press long enough for the magnifier is left to iOS, which opens the edit menu on
 * release, the only remaining route to paste. The iOS app disables WebKit's double tap recognizers natively instead
 * (#6106).
 */
const onTouchEnd = (
  e: TouchEvent,
  {
    editable,
    touchStart,
    placeCaret,
  }: {
    /** The thought or note editable that the touch began on. */
    editable: HTMLElement
    /** Where and when the touch began. */
    touchStart: (Point & { timeStamp: number }) | null
    /** Places the caret at the point, or returns false if the tap should not place it. */
    placeCaret: (point: Point) => boolean
  },
) => {
  const touch = e.changedTouches[0]
  if (
    (osVersionStore.getState() ?? 0) < 27 ||
    isIOS ||
    document.activeElement !== editable ||
    !touchStart ||
    !touch ||
    e.timeStamp - touchStart.timeStamp >= MAGNIFIER_DELAY ||
    moved(touchStart, touch) ||
    !placeCaret(touch)
  ) {
    return
  }

  cover(editable, placeCaret)
}

/**
 * Keeps a selection from being drawn in a thought or note on iOS 27, where any range drawn there starts the same
 * withheld touches as a double tap. Collapses a range in a thought or note before it is drawn, which catches the edit
 * menu's Select and Select All that no overlay can intercept. Also puts the caret back when a tap on the overlay moved
 * the selection onto text outside the editable. Called first from the selectionchange listener in initEvents.
 */
const onSelectionChange = () => {
  if (!isTouch || !isSafari() || (osVersionStore.getState() ?? 0) < 27) return

  const { editable, caret, restoreUntil } = shieldStore.getState()
  if (
    caret !== null &&
    performance.now() < restoreUntil &&
    document.activeElement === editable &&
    selection.isActive() &&
    !selection.isOnEditable()
  ) {
    selection.set(editable, { offset: caret })
    debugLog.log('doubleTapShield', { event: 'restore' })
    return
  }

  if (!selection.isCollapsed() && selection.isOnEditable()) {
    selection.collapse()
    debugLog.log('doubleTapShield', { event: 'collapse' })
  }
}

const doubleTapShield = { onTouchEnd, onSelectionChange, shieldStore, dragTargets }

export default doubleTapShield
