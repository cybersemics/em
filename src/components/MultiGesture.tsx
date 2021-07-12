/* eslint-disable fp/no-class, fp/no-this */
import React from 'react'
import { noop } from 'lodash'
import { Direction, GesturePath } from '../types'
import { GestureResponderEvent } from 'react-native'

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
  onGesture?: (g: Direction | null, sequence: GesturePath, e: GestureResponderEvent) => void
  onEnd?: (sequence: GesturePath | null, e: GestureResponderEvent) => void
  onStart?: () => void
  onCancel?: () => void
  shouldCancelGesture?: () => boolean
  scrollThreshold?: number
  threshold?: number
}

/** Returns u, d, l, r, or null. */
const gesture = (p1: Point, p2: Point, threshold: number) =>
  p2.y - p1.y > threshold
    ? 'd'
    : p1.y - p2.y > threshold
    ? 'u'
    : p2.x - p1.x > threshold
    ? 'r'
    : p1.x - p2.x > threshold
    ? 'l'
    : null

/** A component that handles touch gestures composed of sequential swipes. */
class MultiGesture extends React.Component<MultiGestureProps> {
  abandon = false
  currentStart: Point | null = null
  scrollYStart: number | null = null
  disableScroll = false
  panResponder: { panHandlers: unknown }
  scrolling = false
  sequence: GesturePath = ''

  constructor(props: MultiGestureProps) {
    super(props)

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

    // Listen to touchend directly to catch unterminated gestures.
    // In order to make the gesture system more forgiving, we allow a tiny bit of scroll without abandoning the gesture.
    // Unfortunately, there are some rare cases (difficult to reproduce, but consistent) where onPanResponderRelease is not called, even after touchend. Neither is onPanResponderReject or onPanResponderEnd.
    // onPanResponderTerminate is called consistently, but it is also called for any any scroll event. I am not aware of a way to differentiate when onPanResponderTerminate is called from a scroll event vs a final termination where release it never called.
    // So instead of eliminating the scroll lenience, we can touchend manually and ensure onEnd or onCancel is called appropriately.
    // https://github.com/cybersemics/em/issues/1242
    document.body.addEventListener('touchend', e => {
      if (this.sequence) {
        setTimeout(() => {
          if (!this.abandon && this.sequence) {
            this.props.onEnd?.(this.sequence, e as unknown as GestureResponderEvent)
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
          this.props.onCancel?.()
          this.abandon = true
          return
        }

        // use the first trigger of the move event to initialize this.currentStart
        // onPanResponderStart does not work (why?)
        if (!this.currentStart) {
          this.scrolling = false
          this.currentStart = {
            x: gestureState.moveX,
            y: gestureState.moveY,
          }
          this.scrollYStart = window.scrollY
          if (this.props.onStart) {
            this.props.onStart()
          }
          return
        }

        // abandon gestures when scrolling beyond vertical threshold
        // because scrolling cannot be disabled after it has begin
        // effectively only allows sequences to start with left or right
        if (this.scrolling && Math.abs(this.scrollYStart! - window.scrollY) > this.props.scrollThreshold!) {
          this.sequence = ''
          this.props.onCancel?.()
          this.abandon = true
          return
        }

        const g = gesture(
          this.currentStart,
          {
            x: gestureState.moveX,
            y: gestureState.moveY,
          },
          this.props.threshold!,
        )

        if (g) {
          this.disableScroll = true
          this.currentStart = {
            x: gestureState.moveX,
            y: gestureState.moveY,
          }

          if (g !== this.sequence[this.sequence.length - 1]) {
            this.sequence += g
            this.props.onGesture?.(g, this.sequence, e)
          }
        }
      },

      // In rare cases release won't be called. See touchend above.
      onPanResponderRelease: (e: GestureResponderEvent) => {
        this.props.onEnd?.(this.sequence, e)
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
    // the distance threshold for a single gesture
    // if this is too high, there is an awkward distance between a click and a gesture where nothing happens
    // related: https://github.com/cybersemics/em/issues/1268
    threshold: 3,

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
