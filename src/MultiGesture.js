import React from 'react'

// requires installation of react-dom and react-native-web
import { PanResponder } from 'react-native'

// returns u, d, l, r, or null
const gesture = (p1, p2, threshold) =>
  p2.y - p1.y > threshold ? 'd' :
  p1.y - p2.y > threshold ? 'u' :
  p2.x - p1.x > threshold ? 'r' :
  p1.x - p2.x > threshold ? 'l' :
  null

class MultiGesture extends React.Component {

  constructor(props) {
    super(props)

    this.sequence = ''
    this.currentStart = null
    this.scrolling = false
    this.abandon = false

    // allow enabling/disabling scroll with this.disableScroll
    document.body.addEventListener('touchmove', e => {
      if (this.disableScroll) {
        e.preventDefault()
      }
    }, { passive: false })

    window.addEventListener('scroll', e => {
      this.scrolling = true
    })

    this.panResponder = PanResponder.create({
      onStartShouldSetPanResponder: (evt, gestureState) => true,
      onStartShouldSetPanResponderCapture: (evt, gestureState) => true,
      onMoveShouldSetPanResponder: (evt, gestureState) => true,
      onMoveShouldSetPanResponderCapture: (evt, gestureState) => true,

      // does not report moveX and moveY
      // onPanResponderGrant: (evt, gestureState) => {},

      onPanResponderMove: (evt, gestureState) => {

        if (this.abandon) {
          return
        }

        if (!this.currentStart) {
          this.scrolling = false
          this.currentStart = {
            x: gestureState.moveX,
            y: gestureState.moveY
          }
          this.props.onStart()
          return
        }

        // abandon gestures when scrolling beyond vertical threshold
        // because scrolling cannot be disabled after it has begin
        // effectively only allows sequences to start with left or right
        if (this.scrolling && Math.abs(gestureState.dy) > this.props.threshold) {
          this.sequence = ''
          this.abandon = true
          return
        }

        const g = gesture(this.currentStart, {
          x: gestureState.moveX,
          y: gestureState.moveY
        }, this.props.threshold)

        if (g) {

          this.disableScroll = true
          this.currentStart = {
            x: gestureState.moveX,
            y: gestureState.moveY
          }

          if (g !== this.sequence[this.sequence.length - 1]) {
            this.sequence += g
            this.props.onGesture(g, this.sequence)
          }
        }
      },

      onPanResponderRelease: (evt, gestureState) => {
        if (this.sequence.length) {
          this.props.onEnd(this.sequence)
        }

        // reset
        this.abandon = false
        this.scrolling = false
        this.disableScroll = false
        this.sequence = ''
        this.currentStart = null
      },

      onPanResponderTerminationRequest: (evt, gestureState) => true,
      onPanResponderTerminate: (evt, gestureState) => {
        // Another component has become the responder, so this gesture
        // should be cancelled
      }
    })
  }

  render() {
    return <div {...this.panResponder.panHandlers}>{this.props.children}</div>
  }
}

MultiGesture.defaultProps = {

  // the distance threshold for a single gesture
  threshold: 50,

  // fired at the start of a gesture
  // includes false starts
  onStart: () => {},

  // fired when a new gesture is added to the sequence
  onGesture: (gesture, sequence) => {},

  // fired when all gestures have completed
  onEnd: (sequence) => {}
}

export { MultiGesture }