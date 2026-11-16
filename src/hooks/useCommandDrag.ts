import { PointerEvent as ReactPointerEvent, useCallback, useEffect, useRef } from 'react'
import { useDispatch } from 'react-redux'
import CommandId from '../@types/CommandId'
import Dispatch from '../@types/Dispatch'
import { pinCommandActionCreator as pinCommand } from '../actions/pinCommand'
import { unpinCommandActionCreator as unpinCommand } from '../actions/unpinCommand'
import ringGeometry from '../components/Learning/ringGeometry'
import { DELETE_VIBRATE_DURATION, PINNED_COMMAND_RING_SIZE, TIMEOUT_LONG_PRESS_THOUGHT, TOUCH_SLOP } from '../constants'
import commandDragStore from '../stores/commandDragStore'
import commandEmitter from '../stores/commandEmitter'
import haptics from '../util/haptics'

/** Within this distance of the ring's center, in px, the command pops into the ring and a release pins it. */
export const MAGNET_RADIUS = 56
/** Once in, the command stays in until the pointer is this far from the ring's center, so it does not flicker at the edge. */
const MAGNET_RELEASE_RADIUS = 72
/** How far beyond the magnet the ring starts to fade in, in px. Proximity rises from 0 here to 1 at the magnet. */
const PROXIMITY_RANGE = 260
/** The width of the delete edge along the right of the screen, in px. A drag from the ring that ends there unpins. */
export const UNPIN_EDGE_WIDTH = 40

/**
 * How far the ring moves in from the corner for the length of a drag, in px, from the design. It grows during a drag
 * (see PinnedCommand), and at its resting place the grown ring would run off the edge of the screen.
 */
export const DRAG_RING_SHIFT = { x: -13, y: -20 }
/** A little further in once the command has popped into it and it has grown again. */
export const MAGNET_RING_SHIFT_X = -18

/** The center of the ring during a drag, in viewport px, measured from its dock, or null while the ring is not rendered. */
export const ringCenter = (): { x: number; y: number } | null => {
  const dock = document.querySelector('[data-pinned-command-dock]')
  if (!dock) return null
  const rect = dock.getBoundingClientRect()
  // The dock wraps the ring's box exactly and is never transformed, so the box's corner places the drawn center.
  return {
    x: rect.right - (PINNED_COMMAND_RING_SIZE - ringGeometry.centerX) + DRAG_RING_SHIFT.x,
    y: rect.bottom - (PINNED_COMMAND_RING_SIZE - ringGeometry.centerY) + DRAG_RING_SHIFT.y,
  }
}

/** Swallows the click the browser sends when a drag's press is released, so it does not also open or run the command. */
const swallowNextClick = () => {
  /** Stops the click before it reaches anything. */
  const swallow = (e: MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
  }
  window.addEventListener('click', swallow, { capture: true, once: true })
  // A release that sends no click must not leave the listener to eat a later, real one.
  window.setTimeout(() => window.removeEventListener('click', swallow, { capture: true }), 400)
}

/**
 * Runs one drag from pick-up to release: follows the pointer, updates commandDragStore, and pins or unpins on release.
 * Touch drags follow touch events, whose touchmove can be cancelled to keep the Command Universe from scrolling under
 * the finger; mouse and pen drags follow pointer events.
 */
const runDrag = ({
  commandId,
  source,
  x,
  y,
  pointerType,
  dispatch,
}: {
  commandId: CommandId
  source: 'universe' | 'pinned'
  x: number
  y: number
  pointerType: string
  dispatch: Dispatch
}) => {
  // A drag from the ring arms the delete edge only once it has left the ring, since the ring itself sits at the edge.
  let leftRing = source === 'universe'
  const bodyUserSelect = document.body.style.userSelect
  document.body.style.userSelect = 'none'
  // Removes every listener below when the drag ends.
  const listeners = new AbortController()
  const { signal } = listeners

  haptics.light()
  commandDragStore.update({ commandId, source, x, y, proximity: 0, magnetized: false, overEdge: false })

  /** Moves the dragged command and works out where it is relative to the ring and the edge. */
  const move = (x: number, y: number) => {
    const drag = commandDragStore.getState()
    if (!drag) return
    const center = ringCenter()
    const distance = center ? Math.hypot(x - center.x, y - center.y) : Infinity
    if (distance > MAGNET_RELEASE_RADIUS) leftRing = true
    const magnetized = source === 'universe' && distance < (drag.magnetized ? MAGNET_RELEASE_RADIUS : MAGNET_RADIUS)
    const overEdge =
      source === 'pinned' && leftRing && x > window.innerWidth - UNPIN_EDGE_WIDTH && distance > MAGNET_RELEASE_RADIUS
    if (magnetized && !drag.magnetized) haptics.medium()
    if (overEdge && !drag.overEdge) haptics.light()
    const proximity = Math.min(1, Math.max(0, 1 - (distance - MAGNET_RADIUS) / PROXIMITY_RANGE))
    commandDragStore.update({ x, y, proximity, magnetized, overEdge })
  }

  /** Ends the drag. A release over the ring pins, and a release over the edge unpins; anything else puts it back. */
  const end = (cancelled: boolean) => {
    const drag = commandDragStore.getState()
    listeners.abort()
    document.body.style.userSelect = bodyUserSelect
    commandDragStore.update(null)
    swallowNextClick()
    if (cancelled || !drag) return
    if (drag.source === 'universe' && drag.magnetized) {
      dispatch(pinCommand({ commandId: drag.commandId }))
      haptics.success()
      commandEmitter.trigger('commandPinnedByDrag', drag.commandId)
    } else if (drag.source === 'pinned' && drag.overEdge) {
      dispatch(unpinCommand())
      haptics.vibrate(DELETE_VIBRATE_DURATION)
    }
  }

  if (pointerType === 'touch') {
    window.addEventListener(
      'touchmove',
      e => {
        // Keeps the Command Universe from scrolling, and the browser from cancelling the touch to scroll it.
        if (e.cancelable) e.preventDefault()
        const touch = e.touches[0]
        if (touch) move(touch.clientX, touch.clientY)
      },
      { passive: false, signal },
    )
    window.addEventListener('touchend', e => e.touches.length === 0 && end(false), { signal })
    window.addEventListener('touchcancel', () => end(true), { signal })
  } else {
    window.addEventListener('pointermove', e => move(e.clientX, e.clientY), { signal })
    window.addEventListener('pointerup', () => end(false), { signal })
    window.addEventListener('pointercancel', () => end(true), { signal })
  }
  window.addEventListener('keydown', e => e.key === 'Escape' && end(true), { capture: true, signal })

  // Places the ring's fade from the first frame, before the pointer moves.
  requestAnimationFrame(() => move(x, y))
}

/**
 * Makes an element a drag source for pinning: drag a command from the Command Universe to the ring in the corner to
 * pin it, or drag the pinned command out of the ring to the right edge to unpin it. See "Pinning by dragging" in
 * docs/learning.md.
 *
 * A touch on the Command Universe picks the command up after a long press that has not moved, so a swipe still
 * scrolls. A mouse, and a touch on the ring, pick it up as soon as the press moves, since the ring's own hold opens
 * the detail page instead. `onDragStart` lets the source cancel what the press would otherwise do.
 *
 * It is not built on react-dnd: the drop is decided by distance to the ring rather than by hovering a target, and the
 * ring's 400 ms hold would collide with the TouchBackend's own 400 ms delay.
 */
const useCommandDrag = ({
  commandId,
  source,
  onDragStart,
}: {
  /** The command to drag. Nothing drags while it is undefined. */
  commandId: CommandId | undefined
  source: 'universe' | 'pinned'
  onDragStart?: () => void
}) => {
  const dispatch = useDispatch()
  // Stops waiting for a press to become a drag.
  const cancelPending = useRef<(() => void) | null>(null)
  useEffect(() => () => cancelPending.current?.(), [])

  const onPointerDown = useCallback(
    (e: ReactPointerEvent) => {
      if (!commandId || e.button !== 0 || commandDragStore.getState()) return
      cancelPending.current?.()
      const pointerType = e.pointerType
      const start = { x: e.clientX, y: e.clientY }
      let last = start
      const holdToStart = pointerType === 'touch' && source === 'universe'
      // Removes the listeners below when the press becomes a drag or ends.
      const listeners = new AbortController()
      let timer: number | undefined
      /** Stops waiting. */
      const stop = () => {
        window.clearTimeout(timer)
        listeners.abort()
        cancelPending.current = null
      }
      /** Turns the press into a drag. */
      const begin = () => {
        stop()
        onDragStart?.()
        runDrag({ commandId, source, x: last.x, y: last.y, pointerType, dispatch })
      }

      if (holdToStart) timer = window.setTimeout(begin, TIMEOUT_LONG_PRESS_THOUGHT)
      window.addEventListener(
        'pointermove',
        e => {
          last = { x: e.clientX, y: e.clientY }
          if (Math.hypot(last.x - start.x, last.y - start.y) <= TOUCH_SLOP) return
          // A touch that moves before its long press is a scroll.
          if (holdToStart) stop()
          else begin()
        },
        { signal: listeners.signal },
      )
      window.addEventListener('pointerup', stop, { signal: listeners.signal })
      window.addEventListener('pointercancel', stop, { signal: listeners.signal })
      cancelPending.current = stop
    },
    [commandId, dispatch, onDragStart, source],
  )

  return {
    onPointerDown,
    // The long press is em's own; keep the platform's long-press menu out of it.
    onContextMenu: useCallback((e: React.MouseEvent) => {
      if (cancelPending.current || commandDragStore.getState()) e.preventDefault()
    }, []),
  }
}

export default useCommandDrag
