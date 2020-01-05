/* eslint-disable fp/no-class, fp/no-this */
import React from 'react'

import { NOOP } from '../constants.js'

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
        if (this.scrolling && Math.abs(gestureState.dy) > this.props.scrollThreshold) {
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
            this.props.onGesture(g, this.sequence, evt)
          }
        }
      },

      onPanResponderRelease: (evt, gestureState) => {

        this.props.onEnd(this.sequence, evt)

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
        this.props.onEnd(null, evt)
      }
    })
  }

  render() {
    if (this.props.showOverlay) {
      return <div>{this.props.children}</div>
    }
    return <div {...this.panResponder.panHandlers}>{this.props.children}</div>
  }
}

MultiGesture.defaultProps = {

  // the distance threshold for a single gesture
  threshold: 12,

  // the distance to allow scrolling before abandoning the gesture
  scrollThreshold: 12,

  // fired at the start of a gesture
  // includes false starts
  onStart: NOOP,

  // fired when a new gesture is added to the sequence
  onGesture: (gesture, sequence, evt) => {},

  // fired when all gestures have completed
  onEnd: (sequence, evt) => {}
}

export { MultiGesture }
