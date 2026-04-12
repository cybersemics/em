import React, { PropsWithChildren } from 'react'
import { GestureResponderEvent, PanResponder, PanResponderInstance, View } from 'react-native'
import Direction from '../@types/Direction'
import Gesture from '../@types/Gesture'
import { noop } from '../constants'
import gestureStore from '../stores/gesture'
import isInGestureZone from '../util/isInGestureZone'
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
  onCancel?: (args: { clientStart: Point | null; e: GestureResponderEvent | TouchEvent }) => void
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
  scrollYStart: number | null = null
  disableScroll = false
  panResponder: PanResponderInstance
  scrolling = false
  sequence: Gesture = ''

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
        if (this.disableScroll) {
          e.preventDefault()
        }
      },
      { passive: false },
    )

    // enable/disable scrolling based on where the user clicks
    // TODO: Could this be moved to onMoveShouldSetResponder?
    document.body.addEventListener('touchstart', e => {
      if (e?.touches.length > 0) {
        const x = e.touches[0].clientX
        const y = e.touches[0].clientY
        this.clientStart = { x, y }
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
    window.addEventListener('touchend', () => {
      this.reset()
    })

    // touchcancel is fired when the user switches apps by swiping from the bottom of the screen
    window.addEventListener('touchcancel', e => {
      this.props.onCancel?.({ clientStart: this.clientStart, e })
      this.reset()
    })

    this.panResponder = PanResponder.create({
      // Prevent gesture when any text is selected.
      // See https://github.com/cybersemics/em/issues/676.
      // NOTE: though it works simulating mobile on desktop, selectionchange is too late to prevent actual gesture on mobile, so we can't detect only when the text selection is being dragged
      onMoveShouldSetPanResponder: () => !this.props.shouldCancelGesture?.(),

      onPanResponderMove: (e: GestureResponderEvent, gestureState: GestureState) => {
        if (this.abandon) {
          return
        }

        if (this.props.shouldCancelGesture?.()) {
          this.props.onCancel?.({ clientStart: this.clientStart, e })
          gestureStore.update({ gesture: '' })
          this.abandon = true
          return
        }

        // initialize this.currentStart on the the first trigger of the move event
        // TODO: Why doesn't onPanResponderStart work?
        if (!this.currentStart) {
          // Check if we're in the gesture zone before deciding whether to disable scrolling
          // This ensures we only prevent scrolling in the gesture zone, but allow it elsewhere
          const touchLocation = e.nativeEvent.touches[0] || e.nativeEvent
          const inGestureZone = isInGestureZone(touchLocation.pageX, touchLocation.pageY, this.leftHanded)

          // Only keep disableScroll=true if we're actually in the gesture zone
          // This addresses both issues: prevents scrolling in gesture zone during gestures,
          // but allows scrolling to be re-enabled for normal scroll interactions
          if (!inGestureZone) {
            this.disableScroll = false
          }

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

        const g = gesture(
          this.currentStart,
          {
            x: gestureState.moveX,
            y: gestureState.moveY,
          },
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
          this.currentStart = {
            x: gestureState.moveX,
            y: gestureState.moveY,
          }

          if (g !== this.sequence[this.sequence.length - 1]) {
            // append the gesture to the sequence and call the onGesture handler
            this.sequence += g
            this.props.onGesture?.({ gesture: g, sequence: this.sequence, clientStart: this.clientStart!, e })
            gestureStore.update({ gesture: this.sequence })
          }
        }
      },

      // not called on touchcancel
      onPanResponderRelease: (e: GestureResponderEvent, gestureState: GestureState) => {
        if (!this.abandon) {
          const clientEnd = {
            x: gestureState.moveX,
            y: gestureState.moveY,
          }
          this.props.onEnd?.({ sequence: this.sequence, clientStart: this.clientStart!, clientEnd, e })
        }
        this.reset()
      },

      onPanResponderTerminationRequest: () => true,
    })
  }

  // update leftHanded when props change
  // TODO: Why is the component not re-rendered automatically when a prop changes?
  UNSAFE_componentWillReceiveProps(nextProps: MultiGestureProps) {
    this.leftHanded = !!nextProps.leftHanded
  }

  reset() {
    this.abandon = false
    this.currentStart = null
    this.scrollYStart = null
    this.disableScroll = false
    this.sequence = ''
    gestureStore.update({ gesture: '' })
  }

  render() {
    const ref = React.createRef<HTMLDivElement>()
    return (
      <View {...this.panResponder.panHandlers}>
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
