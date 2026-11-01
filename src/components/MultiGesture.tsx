import React, { PropsWithChildren } from 'react'
import { GestureResponderEvent, PanResponder, PanResponderInstance, View, ViewStyle } from 'react-native'
import Direction from '../@types/Direction'
import Gesture from '../@types/Gesture'
import { noop } from '../constants'
import { caretRectViewport } from '../device/selection'
import getSafeAreaBottom from '../device/virtual-keyboard/getSafeAreaBottom'
import testFlags from '../e2e/testFlags'
import { clearGesture, updateGesture } from '../stores/gestureStore'
import viewportStore from '../stores/viewportStore'
import debugLog from '../util/debugLog'
import isInGestureZone from '../util/isInGestureZone'
import GestureMenu from './GestureMenu/GestureMenu'
import ScrollZone from './ScrollZone'
import TraceGesture from './TraceGesture'

interface Point {
  x: number
  y: number
}

interface GestureState {
  dx: number
  dy: number
  moveX: number
  moveY: number
}

// See: defaultProps for defaults
type MultiGestureProps = PropsWithChildren<{
  // moves the scroll zone to the left side of the screen and the gesture zone to the right
  leftHanded?: boolean
  // fired when a new gesture is added to the sequence
  onGesture?: (args: {
    gesture: Direction | null
    sequence: Gesture
    clientStart: Point
    e: GestureResponderEvent
  }) => void
  // fired when all gestures have completed
  onEnd?: (args: {
    sequence: Gesture | null
    clientStart: Point | null
    clientEnd: Point | null
    e: GestureResponderEvent
  }) => void
  // fired at the start of a gesture
  // includes false starts
  onStart?: (args: { clientStart: Point; e: GestureResponderEvent }) => void
  // fired when a gesture has been cancelled
  onCancel?: (args: { clientStart: Point | null; e: GestureResponderEvent | TouchEvent | PointerEvent }) => void
  // When a swipe is less than this number of pixels, then it won't count as a gesture.
  // if this is too high, there is an awkward distance between a click and a gesture where nothing happens
  // related: https://github.com/cybersemics/em/issues/1268
  minDistance?: number
  /** A hook that is called on touchstart if the user is in the gesture zone. If it returns true, the gesture is abandoned. Otherwise scrolling is disabled and a gesture may be entered. */
  shouldCancelGesture?: (x?: number, y?: number) => boolean
}>

/** Static mapping of intercardinal directions to radians. Used to determine the closest gesture to an angle. Range: -π to π. */
const dirToRad = {
  NoBias: {
    NW: -Math.PI * (3 / 4),
    NE: -Math.PI / 4,
    SE: Math.PI / 4,
    SW: Math.PI * (3 / 4),
  },
  VerticalBias: {
    NW: -Math.PI * (31 / 36),
    NE: -Math.PI * (5 / 36),
    SE: Math.PI * (5 / 36),
    SW: Math.PI * (31 / 36),
  },
  HorizontalBias: {
    NW: -Math.PI * (23 / 36),
    NE: -Math.PI * (13 / 36),
    SE: Math.PI * (13 / 36),
    SW: Math.PI * (23 / 36),
  },
}

type BiasType = keyof typeof dirToRad

/** Return the closest gesture based on the angle between two points. See: https://github.com/cybersemics/em/issues/1379. */
const gesture = (p1: Point, p2: Point, minDistanceSquared: number, bias: BiasType = 'NoBias'): Direction | null => {
  // Instead of calculating the actual distance, calculate distance squared.
  // Then we can compare it directly to minDistanceSquared and avoid the Math.sqrt call completely.
  const distanceSquared = Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2)
  if (distanceSquared < minDistanceSquared) return null

  // Math.atan2 returns 0 to 180deg as 0 to π, and 180 to 360deg as -π to 0 (clockwise starting due right)
  const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x)
  return angle >= dirToRad[bias].NW && angle < dirToRad[bias].NE
    ? 'u'
    : angle >= dirToRad[bias].NE && angle < dirToRad[bias].SE
      ? 'r'
      : angle >= dirToRad[bias].SE && angle < dirToRad[bias].SW
        ? 'd'
        : 'l'
}

/** A component that handles touch gestures composed of sequential swipes. */
class MultiGesture extends React.Component<MultiGestureProps> {
  abandon = false
  clientStart: Point | null = null
  currentStart: Point | null = null
  leftHanded = false
  minDistanceSquared = 0
  multitouch = false
  scrollYStart: number | null = null
  disableScroll = false
  panResponder: PanResponderInstance
  scrolling = false
  sequence: Gesture = ''
  touchTarget: Element | null = null
  // the responder identifier of the finger that is drawing the gesture, set when it first moves
  touchIdentifier: string | null = null
  // the number of touchmove events since the first finger landed, logged on touchend
  touchMoves = 0
  // the touch path of the current gesture for the debug log, as [ms since touchstart, x, y]; null while logging is off
  trace: { t: number; start: number; identifier: number; points: [number, number, number][] } | null = null

  constructor(props: MultiGestureProps) {
    super(props)

    // square the minDistance once for more efficient distance comparisons
    this.minDistanceSquared = Math.pow(props.minDistance || 10, 2)

    // this.leftHanded is updated when props change by UNSAFE_componentWillReceiveProps
    this.leftHanded = !!props.leftHanded

    this.reset()

    // disable scroll by preventing default touchmove
    // allow enabling/disabling scroll with this.disableScroll
    // Note: This breaks window.scrollTo on Mobile Safari when using asyncFocus and scrollY is 0.
    // Other methods of disabling scroll such as overflow: hidden have unintended side effects.
    // This only workable solution I found is to ensure the scroll bar is not at 0 with window.scrollTo(0, 1)
    document.body.addEventListener(
      'touchmove',
      e => {
        if (testFlags.logMultigesture) {
          console.info('touchmove', {
            disableScroll: this.disableScroll,
          })
        }
        this.touchMoves++
        // Recorded here rather than in onPanResponderMove, which misses the moves before the responder is granted.
        const trace = this.trace
        if (trace) {
          const touch = Array.from(e.touches).find(touch => touch.identifier === trace.identifier)
          if (touch) {
            trace.points.push([
              Math.round(performance.now() - trace.start),
              Math.round(touch.clientX),
              Math.round(touch.clientY),
            ])
          }
        }
        if (this.disableScroll) {
          e.preventDefault()
        }
      },
      { passive: false },
    )

    // enable/disable scrolling based on where the user clicks
    // TODO: Could this be moved to onMoveShouldSetResponder?
    document.body.addEventListener('touchstart', e => {
      // A first finger starts a new touch interaction, so clear whatever the previous one left behind. Its touchend
      // does not always reach the window listener below that normally resets it: a toolbar dropdown option stops the
      // propagation of the touchend that selects it, which would leave the abandon latch set by the touch on the
      // toolbar, and the next gesture would be abandoned. See #5850.
      if (e.touches.length === 1) {
        this.multitouch = false
        this.touchMoves = 0
        this.reset()
      }

      if (e.touches.length > 1) {
        // Any finger that lands once the first finger has begun a gesture is ignored for the rest of the touch:
        // onPanResponderMove follows only the first finger, and the gesture still executes when the first finger lifts.
        // The gesture has begun once its first swipe is recognized rather than at the first touchmove, since the first
        // finger of a two-finger trace or of the iOS three-finger undo swipe can move slightly before the others land.
        // See #5966.
        if (this.sequence.length > 0) return

        // Otherwise the touch is multi-touch, which is never a gesture. That covers two-finger tracing and pinching
        // (#4233), and the iOS three-finger swipe that undoes and redoes, which must not also execute an em gesture
        // (#5575). Abandoning makes onPanResponderMove and onPanResponderRelease bail out, so there is no trace, no
        // gesture menu, and no command. A gesture that has already begun is cancelled so that its gesture menu does
        // not stay on screen (#3887). The latch stays set until every finger is up.
        if (this.currentStart) {
          this.props.onCancel?.({ clientStart: this.clientStart, e })
        }
        this.multitouch = true
        this.abandon = true
        this.disableScroll = false
        clearGesture()
        return
      }

      if (testFlags.logMultigesture) {
        const x = e.touches[0].clientX
        const y = e.touches[0].clientY
        console.info('touchstart', {
          isInGestureZone: isInGestureZone(x, y, this.leftHanded),
          shouldCancelGesture: this.props.shouldCancelGesture?.(x, y),
        })
      }

      if (e?.touches.length > 0) {
        const x = e.touches[0].clientX
        const y = e.touches[0].clientY
        debugLog.log('touchstart', () => ({ x: Math.round(x), y: Math.round(y) }))
        // Record where the caret and the thought being edited were when the touch began, so that a touch iOS swallows
        // near the caret can be placed relative to it (#4222). The read is deferred to the next frame because a
        // keystroke just before the touch leaves layout pending, and reading geometry here would force it in the
        // middle of the handler. Animation frame callbacks run before the frame's own layout, so the read performs
        // that layout early instead of adding one. The caret does not move until the finger lifts.
        if (debugLog.isEnabled()) {
          requestAnimationFrame(() => {
            const caret = caretRectViewport()
            if (!caret) return
            debugLog.log('touchCaret', () => ({
              x: Math.round(caret.x),
              y: Math.round(caret.y),
              height: Math.round(caret.height),
              editableLeft: Math.round(caret.editableRect.left),
              editableTop: Math.round(caret.editableRect.top),
              editableRight: Math.round(caret.editableRect.right),
              editableBottom: Math.round(caret.editableRect.bottom),
            }))
          })
        }
        this.clientStart = { x, y }
        this.trace = debugLog.isEnabled()
          ? {
              t: Date.now(),
              start: performance.now(),
              identifier: e.touches[0].identifier,
              points: [[0, Math.round(x), Math.round(y)]],
            }
          : null
        // Remember the element the browser pinned this touch to, so a release can still be detected
        // if that element unmounts mid-gesture. See the pointerup listener below.
        this.touchTarget = e.target instanceof Element ? e.target : null
        const inGestureZone = isInGestureZone(x, y, this.leftHanded)

        if (inGestureZone && !props.shouldCancelGesture?.(x, y)) {
          this.disableScroll = true
        } else {
          this.abandon = true
        }
      }
    })

    // Since we set this.disableScroll or this.abandon on touchstart, we need to reset them on touchend.
    // This occurs, for eample, on tap.
    window.addEventListener('touchend', (e: TouchEvent) => {
      if (testFlags.logMultigesture) {
        console.info('touchend')
      }
      // A touch that iOS swallows gets no touchmove however far the finger travels, so it ends with moves: 0 (#4222).
      debugLog.log('touchend', () => {
        const touch = e.changedTouches[0]
        return {
          ...(touch ? { x: Math.round(touch.clientX), y: Math.round(touch.clientY) } : {}),
          moves: this.touchMoves,
        }
      })
      // Only reset once every finger is up. Fingers leave one at a time, so resetting on the first touchend would clear
      // the multitouch latch and let the last finger still down be tracked as a new single-finger gesture, or would
      // clear the gesture of a first finger that is still down after an ignored second finger lifts.
      if (e.touches.length === 0) {
        this.multitouch = false
        this.reset()
      }
    })

    // touchcancel is fired when the user switches apps by swiping from the bottom of the screen
    window.addEventListener('touchcancel', e => {
      if (testFlags.logMultigesture) {
        console.info('touchcancel')
      }
      debugLog.log('gestureCancel', () => ({
        sequence: this.sequence,
        x: this.clientStart && Math.round(this.clientStart.x),
        y: this.clientStart && Math.round(this.clientStart.y),
        innerHeight: viewportStore.getState().innerHeight,
        safeAreaBottom: getSafeAreaBottom(),
      }))
      this.props.onCancel?.({ clientStart: this.clientStart, e })
      if (e.touches.length === 0) {
        this.multitouch = false
      }
      this.reset()
    })

    // Fallback release signals for the #3887 case where the touched DOM element unmounts mid-gesture
    // (e.g. the EmptyThoughtspace → LayoutTree swap that fires once initial content loads). The
    // browser pins a touch to its touchstart target, so once that element is detached the remaining
    // touchend is dispatched into the detached tree and never reaches the window listener above,
    // leaving PanResponder stuck and the gesture menu visible until the next touch.
    //
    // Pointer events are not pinned the same way: pointerup is still dispatched through the document
    // after the target is gone, so it is the reliable signal here. pointercancel is kept as a
    // secondary net, but it is not dispatched on target removal in every engine, so it cannot be
    // relied on alone.
    //
    // Both are registered in the capture phase so nothing downstream can stopPropagation first, and
    // both no-op unless a gesture is in progress. pointerup additionally requires the original target
    // to be detached, so a normal gesture is always released by onPanResponderRelease — regardless of
    // whether the engine dispatches pointerup before or after touchend.
    document.addEventListener(
      'pointercancel',
      (e: PointerEvent) => {
        if (!this.currentStart) return
        this.props.onCancel?.({ clientStart: this.clientStart, e })
        this.reset()
      },
      true,
    )

    document.addEventListener(
      'pointerup',
      (e: PointerEvent) => {
        if (!this.currentStart || this.touchTarget?.isConnected !== false) return
        if (testFlags.logMultigesture) {
          console.info('pointerup with detached touch target', { sequence: this.sequence })
        }
        this.props.onCancel?.({ clientStart: this.clientStart, e })
        this.reset()
      },
      true,
    )

    this.panResponder = PanResponder.create({
      // Prevent gesture when any text is selected.
      // See https://github.com/cybersemics/em/issues/676.
      // NOTE: though it works simulating mobile on desktop, selectionchange is too late to prevent actual gesture on mobile, so we can't detect only when the text selection is being dragged
      onMoveShouldSetPanResponder: () => {
        if (testFlags.logMultigesture) {
          console.info('onMoveShouldSetPanResponder', {
            shouldCancelGesture: this.props.shouldCancelGesture?.(),
          })
        }
        return !this.multitouch && !this.props.shouldCancelGesture?.()
      },

      onPanResponderMove: (e: GestureResponderEvent, gestureState: GestureState) => {
        if (testFlags.logMultigesture) {
          console.info('onPanResponderMove', {
            shouldCancelGesture: this.props.shouldCancelGesture?.(),
            gestureState,
            abandon: this.abandon,
            disableScroll: this.disableScroll,
          })
        }

        if (this.abandon) {
          return
        }

        // A gesture is always a single finger. iOS reports its own multi-finger system gestures — notably the
        // three-finger swipe that undoes and redoes — to the page as ordinary touch events, and tracking the first
        // of those fingers would commit them as em gestures: a three-finger swipe left matches cursorForward and a
        // swipe right matches cursorBack. Both are undoable, so each one clears the redo stack and the redo half of
        // the gesture it was meant to be finds nothing to restore (#5575). device/nativeHistory.ts recognizes the
        // swipe for what it is.
        if (this.multitouch) {
          return
        }

        if (this.props.shouldCancelGesture?.()) {
          this.props.onCancel?.({ clientStart: this.clientStart, e })
          clearGesture()
          this.abandon = true
          return
        }

        // Follow the finger that began the gesture, so that a finger that joins once the gesture is underway cannot
        // move it (#5966). gestureState cannot be used, since its moveX and moveY are the centroid of every finger that
        // moved.
        const touch = this.currentStart
          ? e.nativeEvent.touches.find(touch => touch.identifier === this.touchIdentifier)
          : e.nativeEvent.touches[0] || e.nativeEvent
        if (!touch) return

        // React Native Web reports page coordinates. Measure finger movement in the viewport so
        // momentum scrolling cannot turn an upward swipe into a downward or stationary gesture.
        // isInGestureZone also takes viewport coordinates. Otherwise the zone's viewport-relative bounds are compared
        // against scroll-offset coordinates and the check breaks when the page is scrolled.
        const clientPoint = {
          x: touch.pageX - window.scrollX,
          y: touch.pageY - window.scrollY,
        }

        // initialize this.currentStart on the the first trigger of the move event
        // TODO: Why doesn't onPanResponderStart work?
        if (!this.currentStart) {
          // Check if we're in the gesture zone before deciding whether to disable scrolling
          // This ensures we only prevent scrolling in the gesture zone, but allow it elsewhere
          const inGestureZone = isInGestureZone(clientPoint.x, clientPoint.y, this.leftHanded)

          // Only keep disableScroll=true if we're actually in the gesture zone
          // This addresses both issues: prevents scrolling in gesture zone during gestures,
          // but allows scrolling to be re-enabled for normal scroll interactions
          if (!inGestureZone) {
            this.disableScroll = false
          }

          this.currentStart = clientPoint
          this.touchIdentifier = touch.identifier
          this.scrollYStart = window.scrollY
          if (this.props.onStart) {
            this.props.onStart({ clientStart: this.clientStart!, e })
          }
          return
        }

        const g = gesture(
          this.currentStart,
          clientPoint,
          this.minDistanceSquared,
          // The new sequence will be appended as soon as it is detected, so we need to base the bias on the second-to-last letter in the sequence
          this.sequence.length > 1
            ? ['u', 'd'].includes(this.sequence[this.sequence.length - 2])
              ? 'HorizontalBias'
              : 'VerticalBias'
            : 'NoBias',
        )

        if (g) {
          this.disableScroll = true
          this.currentStart = clientPoint

          if (g !== this.sequence[this.sequence.length - 1]) {
            // append the gesture to the sequence and call the onGesture handler
            this.sequence += g
            debugLog.log('swipe', { dir: g, sequence: this.sequence })
            this.props.onGesture?.({ gesture: g, sequence: this.sequence, clientStart: this.clientStart!, e })
            updateGesture(this.sequence)
          }
        }
      },

      // A gesture ends when the finger that drew it lifts, even if fingers that joined it are still down, which
      // onPanResponderRelease waits for. The rest of the touch is then ignored. See #5966.
      onPanResponderEnd: (e: GestureResponderEvent) => {
        if (e.nativeEvent.touches.length === 0) return
        const touch = e.nativeEvent.changedTouches.find(touch => touch.identifier === this.touchIdentifier)
        if (!touch) return
        this.release(e, { x: touch.pageX - window.scrollX, y: touch.pageY - window.scrollY })
        this.abandon = true
      },

      // not called on touchcancel
      onPanResponderRelease: (e: GestureResponderEvent, gestureState: GestureState) => {
        if (testFlags.logMultigesture) {
          console.info('onPanResponderRelease', {
            gestureState,
            abandon: this.abandon,
          })
        }
        this.release(e, {
          x: gestureState.moveX - window.scrollX,
          y: gestureState.moveY - window.scrollY,
        })
      },

      onPanResponderTerminationRequest: () => !this.disableScroll,
    })
  }

  // update leftHanded when props change
  // TODO: Why is the component not re-rendered automatically when a prop changes?
  UNSAFE_componentWillReceiveProps(nextProps: MultiGestureProps) {
    this.leftHanded = !!nextProps.leftHanded
  }

  /** Ends the gesture, executing it unless it was abandoned. */
  release(e: GestureResponderEvent, clientEnd: Point) {
    // Log the start and end coordinates so that a false gesture, such as an OS app switcher swipe misread as a command gesture, can be diagnosed from the debug log. innerHeight and safeAreaBottom determine the bottom system-gesture exclusion that was in effect (see isInGestureZone), so the log also reveals if the exclusion was inert because the safe area inset read as zero.
    debugLog.log('gesture', () => ({
      sequence: this.sequence,
      x: this.clientStart && Math.round(this.clientStart.x),
      y: this.clientStart && Math.round(this.clientStart.y),
      endX: Math.round(clientEnd.x),
      endY: Math.round(clientEnd.y),
      abandon: this.abandon,
      innerHeight: viewportStore.getState().innerHeight,
      safeAreaBottom: getSafeAreaBottom(),
    }))
    // A touch abandoned before its first swipe, such as a scroll outside the gesture zone, is not a gesture, and would
    // push the gestures worth diagnosing out of the five traces the log keeps.
    if (this.trace && (this.sequence || !this.abandon)) {
      debugLog.logGestureTrace({
        t: this.trace.t,
        sequence: this.sequence,
        abandon: this.abandon,
        points: this.trace.points,
      })
    }
    this.trace = null
    if (!this.abandon) {
      this.props.onEnd?.({ sequence: this.sequence, clientStart: this.clientStart!, clientEnd, e })
    }
    this.reset()
  }

  reset() {
    this.abandon = false
    this.currentStart = null
    this.scrollYStart = null
    this.disableScroll = false
    this.sequence = ''
    this.touchTarget = null
    this.touchIdentifier = null
    clearGesture()
  }

  render() {
    const ref = React.createRef<HTMLDivElement>()
    return (
      <View
        {...this.panResponder.panHandlers}
        // View's default z-index:0 traps children below NavBar's stacking context; z-index:auto
        // removes it, letting gesture blur/trace layer above NavBar in the root context.
        style={{ zIndex: 'auto' } as unknown as ViewStyle}
      >
        {/* GestureMenu mounts here (rather than at the app root) so the menu, its content blur, and the
            gesture trace share this <View>'s stacking context, letting z-index order the trace above the
            blur. GestureMenu renders nothing until the menu is active. */}
        <GestureMenu />
        <TraceGesture eventNodeRef={ref} />
        <ScrollZone leftHanded={this.leftHanded} />
        <div ref={ref}>{this.props.children}</div>
      </View>
    )
  }

  static defaultProps: MultiGestureProps = {
    leftHanded: false,
    minDistance: 10,
    onStart: noop,
    onGesture: noop,
    onEnd: noop,
  }
}

export default MultiGesture
