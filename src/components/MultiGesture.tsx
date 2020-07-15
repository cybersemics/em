/* eslint-disable fp/no-class, fp/no-this */
import React from 'react'
import { noop } from 'lodash'

// requires peer dependencies react-dom and react-native-web
// @ts-ignore
import { PanResponder, View } from 'react-native'

interface Point {
  x: number,
  y: number,
}

type Direction = 'u' | 'd' | 'l' | 'r'

type Sequence = Direction[] | ''

interface GestureState {
  dx: number,
  dy: number,
  moveX: number,
  moveY: number,
}

interface MultiGestureProps {
  onGesture?: (g: Direction | null, sequence: Sequence, evt: any) => void,
  onEnd?: (sequence: Sequence | null, evt: string) => void,
  onStart?: () => void,
  scrollThreshold?: number,
  threshold?: number,
}

/** Returns u, d, l, r, or null. */
const gesture = (p1: Point, p2: Point, threshold: number) =>
  p2.y - p1.y > threshold ? 'd' :
  p1.y - p2.y > threshold ? 'u' :
  p2.x - p1.x > threshold ? 'r' :
  p1.x - p2.x > threshold ? 'l' :
  null

/** Returns true if no text is selected. */
const noTextSelected = () => !window.getSelection()?.toString()

/** A component that handles touch gestures composed of sequential swipes. */
class MultiGesture extends React.Component<MultiGestureProps> {

  abandon = false;
  currentStart: Point | null = null;
  disableScroll = false;
  panResponder: { panHandlers: any };
  scrolling = false;
  sequence: Sequence = '';

  constructor(props: MultiGestureProps) {
    super(props)

    this.reset()

    // allow enabling/disabling scroll with this.disableScroll
    document.body.addEventListener('touchmove', e => {
      if (this.disableScroll) {
        e.preventDefault()
      }
    }, { passive: false })

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
      onStartShouldSetPanResponder: noTextSelected,
      onStartShouldSetPanResponderCapture: noTextSelected,
      onMoveShouldSetPanResponder: noTextSelected,
      onMoveShouldSetPanResponderCapture: noTextSelected,

      // does not report moveX and moveY
      // onPanResponderGrant: (evt, gestureState) => {},

      onPanResponderMove: (evt: string, gestureState: GestureState) => {

        if (this.abandon) {
          return
        }

        if (!this.currentStart) {
          this.scrolling = false
          this.currentStart = {
            x: gestureState.moveX,
            y: gestureState.moveY
          }
          if (this.props.onStart) {
            this.props.onStart()
          }
          return
        }

        // abandon gestures when scrolling beyond vertical threshold
        // because scrolling cannot be disabled after it has begin
        // effectively only allows sequences to start with left or right
        if (this.scrolling && Math.abs(gestureState.dy) > this.props.scrollThreshold!) {
          this.sequence = ''
          this.abandon = true
          return
        }

        const g = gesture(this.currentStart, {
          x: gestureState.moveX,
          y: gestureState.moveY
        }, this.props.threshold!)

        if (g) {
          this.disableScroll = true
          this.currentStart = {
            x: gestureState.moveX,
            y: gestureState.moveY
          }

          if (g !== this.sequence[this.sequence.length - 1]) {
            this.sequence += g
            if (this.props.onGesture) {
              this.props.onGesture(g, this.sequence as Sequence, evt)
            }
          }
        }
      },

      onPanResponderRelease: (evt: string) => {
        if (this.props.onEnd) {
          this.props.onEnd(this.sequence, evt)
        }
        this.reset()
      },

      onPanResponderTerminationRequest: () => true,
      onPanResponderTerminate: (evt: string) => {
        // Another component has become the responder, so this gesture
        // should be cancelled
        if (this.props.onEnd) {
          this.props.onEnd(null, evt)
        }
      }
    })
  }

  reset() {
    this.abandon = false
    this.currentStart = null
    this.disableScroll = false
    this.scrolling = false
    this.sequence = ''
  }

  render() {
    return <View {...this.panResponder.panHandlers}>{this.props.children}</View>
  }
}

// @ts-ignore
MultiGesture.defaultProps = {

  // the distance threshold for a single gesture
  threshold: 12,

  // the distance to allow scrolling before abandoning the gesture
  scrollThreshold: 12,

  // fired at the start of a gesture
  // includes false starts
  onStart: noop,

  // fired when a new gesture is added to the sequence
  onGesture: noop,

  // fired when all gestures have completed
  onEnd: noop
}

export default MultiGesture
