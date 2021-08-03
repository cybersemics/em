import React, { useEffect, useImperativeHandle, useState } from 'react'
import { noop } from 'lodash'
import { Direction, GesturePath } from '../@types'
import { GestureResponderEvent, PanResponder, ScrollView } from 'react-native'
import { commonStyles } from '../style/commonStyles'

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
  children: React.ReactNode
}

export interface MultiGestureRef {
  scrolling: boolean
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
const MultiGesture = React.forwardRef<MultiGestureRef, MultiGestureProps>(
  (
    {
      threshold = 3,

      // the distance to allow scrolling before abandoning the gesture
      scrollThreshold = 15,

      // fired at the start of a gesture
      // includes false starts
      onStart = noop,

      // fired when a new gesture is added to the sequence
      onGesture = noop,

      // fired when all gestures have completed
      onEnd = noop,
      ...props
    },
    ref,
  ) => {
    const [scrolling, setScroll] = useState(true)

    let abandon = false
    let currentStart: Point | null = null
    let scrollYStart: number | null = null
    let sequence: GesturePath = ''

    useImperativeHandle(ref, () => ({ scrolling }))

    useEffect(() => {
      reset()
    }, [])

    /** Reset initial values. */
    const reset = () => {
      abandon = false
      currentStart = null
      scrollYStart = null
      setScroll(true)
      sequence = ''
    }

    const panResponder = React.useMemo(
      () =>
        PanResponder.create({
          // Prevent gesture when any text is selected.
          // See https://github.com/cybersemics/em/issues/676.
          // NOTE: thought it works simulating mobile on desktop, selectionchange is too late to prevent actual gesture on mobile, so we can't detect only when the text selection is being dragged
          onMoveShouldSetPanResponder: () => !props.shouldCancelGesture?.() ?? true,
          onMoveShouldSetPanResponderCapture: () => !props.shouldCancelGesture?.() ?? true,

          // does not report moveX and moveY
          // onPanResponderGrant: (e, gestureState) => {},

          onPanResponderMove: (e: GestureResponderEvent, gestureState: GestureState) => {
            if (abandon) {
              return
            }

            if (props.shouldCancelGesture?.()) {
              props.onCancel?.()
              abandon = true
              return
            }

            // use the first trigger of the move event to initialize this.currentStart
            // onPanResponderStart does not work (why?)
            if (!currentStart) {
              currentStart = {
                x: gestureState.moveX,
                y: gestureState.moveY,
              }

              if (onStart) {
                onStart()
              }
              return
            }

            // abandon gestures when scrolling beyond vertical threshold
            // because scrolling cannot be disabled after it has begin
            // effectively only allows sequences to start with left or right
            if (scrolling && Math.abs(scrollYStart! - window.scrollY) > scrollThreshold!) {
              sequence = ''
              setScroll(true)
              props.onCancel?.()
              abandon = true
              return
            }

            const g = gesture(
              currentStart,
              {
                x: gestureState.moveX,
                y: gestureState.moveY,
              },
              threshold!,
            )

            if (g) {
              currentStart = {
                x: gestureState.moveX,
                y: gestureState.moveY,
              }

              if (g !== sequence[sequence.length - 1]) {
                sequence += g

                // reset gestures if swipe up or down.
                if (sequence[0] === 'u' || sequence[0] === 'd') {
                  reset()
                  return
                }

                setScroll(false)
                onGesture?.(g, sequence, e)
              }
            }
          },

          // In rare cases release won't be called. See touchend above.
          onPanResponderRelease: (e: GestureResponderEvent) => {
            onEnd?.(sequence, e)
            reset()
          },

          onPanResponderTerminationRequest: () => true,
        }),
      [],
    )

    return (
      <ScrollView
        style={commonStyles.flexOne}
        {...panResponder.panHandlers}
        scrollEnabled={scrolling}
        nestedScrollEnabled={true}
      >
        {props.children}
      </ScrollView>
    )
  },
)

export default MultiGesture
