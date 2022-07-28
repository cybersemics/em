/* eslint-disable fp/no-class, fp/no-this */
import { noop } from 'lodash'
import React from 'react'
import { GestureResponderEvent } from 'react-native'
import Direction from '../@types/Direction'
import GesturePath from '../@types/GesturePath'

// expects peer dependencies react-dom and react-native-web
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { PanResponder, View } = require('react-native')

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

interface MultiGestureProps {
  onGesture?: (args: {
    gesture: Direction | null
    sequence: GesturePath
    clientStart: Point
    e: GestureResponderEvent
  }) => void
  onEnd?: (args: {
    sequence: GesturePath | null
    clientStart: Point
    clientEnd: Point
    e: GestureResponderEvent
  }) => void
  onStart?: (args: { clientStart: Point; e: GestureResponderEvent }) => void
  onCancel?: (args: { clientStart: Point; e: GestureResponderEvent }) => void
  minDistance?: number
  shouldCancelGesture?: () => boolean
  scrollThreshold?: number
}

/** Static mapping of intercardinal directions to radians. Used to determine the closest gesture to an angle. Range: -π to π. */
const dirToRad = {
  NW: -Math.PI * (3 / 4),
  NE: -Math.PI / 4,
  SE: Math.PI / 4,
  SW: Math.PI * (3 / 4),
}

/** Return the closest gesture based on the angle between two points. See: https://github.com/cybersemics/em/issues/1379. */
const gesture = (p1: Point, p2: Point, minDistanceSquared: number): Direction | null => {
  // Instead of calculating the actual distance, calculate distance squared.
  // Then we can compare it directly to minDistanceSquared and avoid the Math.sqrt call completely.
  const distanceSquared = Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2)
  if (distanceSquared < minDistanceSquared) return null

  // Math.atan2 returns 0 to 180deg as 0 to π, and 180 to 360deg as -π to 0 (clockwise starting due right)
  const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x)
  return angle >= dirToRad.NW && angle < dirToRad.NE
    ? 'u'
    : angle >= dirToRad.NE && angle < dirToRad.SE
    ? 'r'
    : angle >= dirToRad.SE && angle < dirToRad.SW
    ? 'd'
    : 'l'
}

/** A component that handles touch gestures composed of sequential swipes. */
class MultiGesture extends React.Component<MultiGestureProps> {
  abandon = false
  clientStart: Point | null = null
  currentStart: Point | null = null
  minDistanceSquared = 0
  scrollYStart: number | null = null
  disableScroll = false
  panResponder: { panHandlers: unknown }
  scrolling = false
  sequence: GesturePath = ''

  constructor(props: MultiGestureProps) {
    super(props)

    // square the minDistance once for more efficient distance comparisons
    this.minDistanceSquared = Math.pow(props.minDistance || 10, 2)

    this.reset()

    // allow enabling/disabling scroll with this.disableScroll
    document.body.addEventListener(
      'touchmove',
      e => {
        if (this.disableScroll) {
          e.preventDefault()
        }
      },
      { passive: false },
    )

    document.body.addEventListener('touchstart', e => {
      this.clientStart = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      }
    })

    // Listen to touchend directly to catch unterminated gestures.
    // In order to make the gesture system more forgiving, we allow a tiny bit of scroll without abandoning the gesture.
    // Unfortunately, there are some cases (#1242) where onPanResponderRelease is never called. Neither is onPanResponderReject or onPanResponderEnd.
    // onPanResponderTerminate is called consistently, but it is also called for any any scroll event. I am not aware of a way to differentiate when onPanResponderTerminate is called from a scroll event vs a final termination where release it never called.
    // So instead of eliminating the scroll lenience, we listen to touchend manually and ensure onEnd is called appropriately.
    // Fixes https://github.com/cybersemics/em/issues/1242
    document.body.addEventListener('touchend', e => {
      // manually reset everything except sequence and abandon, in case reset does not get called
      // Fixes https://github.com/cybersemics/em/issues/1189
      this.currentStart = null
      this.scrollYStart = null
      this.disableScroll = false
      this.scrolling = false

      if (this.sequence) {
        // wait for the next event loop to ensure that the gesture wasn't already abandoned or ended
        setTimeout(() => {
          if (!this.abandon && this.sequence) {
            const clientEnd = {
              x: e.touches[0].clientX,
              y: e.touches[0].clientY,
            }
            this.props.onEnd?.({
              sequence: this.sequence,
              clientStart: this.clientStart!,
              clientEnd,
              e: e as unknown as GestureResponderEvent,
            })
            this.reset()
          }
        })
      }
    })

    document.addEventListener('visibilitychange', () => {
      this.reset()
    })

    window.addEventListener('scroll', () => {
      this.scrolling = true
    })

    this.panResponder = PanResponder.create({
      // Prevent gesture when any text is selected.
      // See https://github.com/cybersemics/em/issues/676.
      // NOTE: thought it works simulating mobile on desktop, selectionchange is too late to prevent actual gesture on mobile, so we can't detect only when the text selection is being dragged
      onMoveShouldSetPanResponder: () => !this.props.shouldCancelGesture?.() ?? true,
      onMoveShouldSetPanResponderCapture: () => !this.props.shouldCancelGesture?.() ?? true,

      // does not report moveX and moveY
      // onPanResponderGrant: (e, gestureState) => {},

      onPanResponderMove: (e: GestureResponderEvent, gestureState: GestureState) => {
        if (this.abandon) {
          return
        }

        if (this.props.shouldCancelGesture?.()) {
          this.props.onCancel?.({ clientStart: this.clientStart!, e })
          this.abandon = true
          return
        }

        // use the first trigger of the move event to initialize this.currentStart
        // onPanResponderStart does not work (why?)
        if (!this.currentStart) {
          this.scrolling = false
          // ensure that disableScroll is false when starting in case it wasn't reset properly
          // may be related to https://github.com/cybersemics/em/issues/1189
          this.disableScroll = false
          this.currentStart = {
            x: gestureState.moveX,
            y: gestureState.moveY,
          }
          this.scrollYStart = window.scrollY
          if (this.props.onStart) {
            this.props.onStart({ clientStart: this.clientStart!, e })
          }
          return
        }

        // abandon gestures when scrolling beyond vertical threshold
        // because scrolling cannot be disabled after it has begin
        // effectively only allows sequences to start with left or right
        if (this.scrolling && Math.abs(this.scrollYStart! - window.scrollY) > this.props.scrollThreshold!) {
          this.sequence = ''
          this.props.onCancel?.({ clientStart: this.clientStart!, e })
          this.abandon = true
          return
        }

        const g = gesture(
          this.currentStart,
          {
            x: gestureState.moveX,
            y: gestureState.moveY,
          },
          this.minDistanceSquared,
        )

        if (g) {
          this.disableScroll = true
          this.currentStart = {
            x: gestureState.moveX,
            y: gestureState.moveY,
          }

          if (g !== this.sequence[this.sequence.length - 1]) {
            this.sequence += g
            this.props.onGesture?.({ gesture: g, sequence: this.sequence, clientStart: this.clientStart!, e })
          }
        }
      },

      // In rare cases release won't be called. See touchend above.
      onPanResponderRelease: (e: GestureResponderEvent, gestureState: GestureState) => {
        const clientEnd = {
          x: gestureState.moveX,
          y: gestureState.moveY,
        }
        this.props.onEnd?.({ sequence: this.sequence, clientStart: this.clientStart!, clientEnd, e })
        this.reset()
      },

      onPanResponderTerminationRequest: () => true,
    })
  }

  reset() {
    this.abandon = false
    this.currentStart = null
    this.scrollYStart = null
    this.disableScroll = false
    this.scrolling = false
    this.sequence = ''
  }

  render() {
    return <View {...this.panResponder.panHandlers}>{this.props.children}</View>
  }

  static defaultProps: MultiGestureProps = {
    // When a swipe is less than this number of pixels, then it won't count as a gesture.
    // if this is too high, there is an awkward distance between a click and a gesture where nothing happens
    // related: https://github.com/cybersemics/em/issues/1268
    minDistance: 10,

    // the distance to allow scrolling before abandoning the gesture
    scrollThreshold: 15,

    // fired at the start of a gesture
    // includes false starts
    onStart: noop,

    // fired when a new gesture is added to the sequence
    onGesture: noop,

    // fired when all gestures have completed
    onEnd: noop,
  }
}

export default MultiGesture
