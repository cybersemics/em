import { noop } from 'lodash'
import React, { FC, useEffect, useState } from 'react'
import { GestureResponderEvent, PanResponder, ScrollView } from 'react-native'
import Direction from '../@types/Direction'
import GesturePath from '../@types/GesturePath'
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
  children: React.ReactNode
  onGesture?: (g: Direction | null, sequence: GesturePath, e: GestureResponderEvent) => void
  onEnd?: (sequence: GesturePath | null, e: GestureResponderEvent) => void
  onStart?: () => void
  onCancel?: () => void
  // When a swipe is less than this number of pixels, then it won't count as a gesture.
  // if this is too high, there is an awkward distance between a click and a gesture where nothing happens
  // related: https://github.com/cybersemics/em/issues/1268
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
const MultiGesture: FC<MultiGestureProps> = ({
  minDistance = 10,

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
}) => {
  const [isGestureActive, setIsGestureActive] = useState(false)

  // square the minDistance once for more efficient distance comparisons
  const minDistanceSquared = Math.pow(minDistance, 2)

  let abandon = false
  let currentStart: Point | null = null
  let scrollYStart: number | null = null
  let sequence: GesturePath = ''

  useEffect(() => {
    reset()
  }, [])

  /** Reset initial values. */
  const reset = () => {
    abandon = false
    currentStart = null
    scrollYStart = null
    setIsGestureActive(false)
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
          if (isGestureActive && Math.abs(scrollYStart! - window.scrollY) > scrollThreshold!) {
            sequence = ''
            setIsGestureActive(true)
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
            minDistanceSquared,
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

              setIsGestureActive(true)
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
      scrollEnabled={!isGestureActive}
      nestedScrollEnabled={true}
    >
      {props.children}
    </ScrollView>
  )
}

export default MultiGesture
