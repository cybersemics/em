/* eslint-disable fp/no-class, fp/no-this */
import { noop } from 'lodash'
import React, { useCallback, useEffect, useRef } from 'react'
import { GestureResponderEvent } from 'react-native'
import { useSelector } from 'react-redux'
import SignaturePad from 'react-signature-pad-wrapper'
import { CSSTransition } from 'react-transition-group'
import Direction from '../@types/Direction'
import GesturePath from '../@types/GesturePath'
import themeColors from '../selectors/themeColors'
import ministore, { Ministore } from '../stores/ministore'
import viewportStore from '../stores/viewport'

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
  disableTrace?: boolean
  onGesture?: (args: {
    gesture: Direction | null
    sequence: GesturePath
    clientStart: Point
    e: GestureResponderEvent
  }) => void
  onEnd?: (args: {
    sequence: GesturePath | null
    clientStart: Point | null
    clientEnd: Point | null
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

/** Draws a gesture as it is being performed onto a canvas. */
const TraceGesture = ({ showStore }: { showStore: Ministore<boolean | null> }) => {
  const colors = useSelector(themeColors)
  const show = showStore.useState()
  const innerHeight = viewportStore.useSelector(state => state.innerHeight)
  const signaturePadRef = useRef<{ minHeight: number; signaturePad: SignaturePad['signaturePad'] } | null>(null)
  const fadeTimer = useRef(0)

  // Clear the signature pad when the stroke starts.
  // This is easier than clearing when the stroke ends where we would have to account for the fade timeout.
  const onBeginStroke = useCallback(() => {
    clearTimeout(fadeTimer.current)
    if (!signaturePadRef.current) return
    signaturePadRef.current.signaturePad.clear()
  }, [])

  useEffect(() => {
    if (!signaturePadRef.current) return
    const signaturePad = signaturePadRef.current.signaturePad
    signaturePad.addEventListener('beginStroke', onBeginStroke)

    // update canvas dimensions, otherwise the initial height on load is too large for some reason
    // https://github.com/szimek/signature_pad/issues/118#issuecomment-146207233
    signaturePad.canvas.width = signaturePad.canvas.offsetWidth
    signaturePad.canvas.height = signaturePad.canvas.offsetHeight

    return () => {
      signaturePad.removeEventListener('beginStroke', onBeginStroke)
    }
  }, [])

  return (
    <div className='z-index-gesture-trace' style={{ position: 'fixed', top: 0, left: 0, height: innerHeight }}>
      <CSSTransition in={show !== false} timeout={400} classNames='fade-both'>
        <div
          // use fade-both-enter to start the opacity at 0, otherwise clicking will render small dots
          className='fade-both-enter'
        >
          <SignaturePad
            height={innerHeight}
            // TODO: Fix type
            ref={signaturePadRef as any}
            options={{
              penColor: colors.fg,
            }}
          />
        </div>
      </CSSTransition>
    </div>
  )
}

/** A component that handles touch gestures composed of sequential swipes. */
class MultiGesture extends React.Component<MultiGestureProps> {
  abandon = false
  clientStart: Point | null = null
  currentStart: Point | null = null
  disableTrace = false
  minDistanceSquared = 0
  scrollYStart: number | null = null
  disableScroll = false
  panResponder: { panHandlers: unknown }
  scrolling = false
  sequence: GesturePath = ''
  // a ministore that tracks if the trace should be shown (true), hidden (false), or inactive (null)
  showStore = ministore<boolean | null>(false)

  constructor(props: MultiGestureProps) {
    super(props)

    // square the minDistance once for more efficient distance comparisons
    this.minDistanceSquared = Math.pow(props.minDistance || 10, 2)

    this.reset()

    // disable scroll by preventing default touchmove
    // allow enabling/disabling scroll with this.disableScroll
    // Note: This breaks window.scrollTo on Mobile Safari when using asyncFocus and scrollY is 0.
    // Other methods of disabling scroll such as overflow: hidden have unintended side effects.
    // This only workable solution I found is to ensure the scroll bar is not at 0 with window.scrollTo(0, 1)
    document.body.addEventListener(
      'touchmove',
      e => {
        if (this.disableScroll && e.cancelable) {
          e.preventDefault()
        }
      },
      { passive: false },
    )

    document.body.addEventListener('touchstart', e => {
      if (e?.touches.length > 0) {
        this.clientStart = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
        }
      }
    })

    // Listen to touchend directly to catch unterminated gestures.
    // In order to make the gesture system more forgiving, we allow a tiny bit of scroll without abandoning the gesture.
    // Unfortunately, there are some cases (#1242) where onPanResponderRelease is never called. Neither is onPanResponderReject or onPanResponderEnd.
    // onPanResponderTerminate is called consistently, but it is also called for any scroll event. I am not aware of a way to differentiate when onPanResponderTerminate is called from a scroll event vs a final termination where release it never called.
    // So instead of eliminating the scroll lenience, we listen to touchend manually and ensure onEnd is always called.
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
            const clientEnd =
              e?.touches.length > 0
                ? {
                    x: e.touches[0].clientX,
                    y: e.touches[0].clientY,
                  }
                : null
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
      // NOTE: though it works simulating mobile on desktop, selectionchange is too late to prevent actual gesture on mobile, so we can't detect only when the text selection is being dragged
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
          this.showStore.update(null)
          this.abandon = true
          return
        }

        // initialize this.currentStart on the the first trigger of the move event
        // TODO: Why doesn't onPanResponderStart work?
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
            // abandon gestures that start with d or u
            // this can occur when dragging down at the top of the screen on mobile
            // since scrollY is already 0,  this.scrolling will not be set to true to abandon the gesture
            if (this.sequence.length === 0 && (g === 'd' || g === 'u')) {
              this.abandon = true
            }
            // otherwise append the gesture to the sequence and call the onGesture handler
            else {
              this.sequence += g
              this.props.onGesture?.({ gesture: g, sequence: this.sequence, clientStart: this.clientStart!, e })
              if (this.sequence.length === 1) {
                this.showStore.update(true)
              }
            }
          }
        }
      },

      // In rare cases release won't be called. See touchend above.
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

  reset() {
    this.abandon = false
    this.currentStart = null
    this.scrollYStart = null
    this.disableScroll = false
    this.scrolling = false
    this.sequence = ''
    this.showStore.update(false)
  }

  render() {
    return (
      <div>
        <View {...this.panResponder.panHandlers}>
          <TraceGesture showStore={this.showStore} />
          {this.props.children}
        </View>
      </div>
    )
  }

  static defaultProps: MultiGestureProps = {
    // if true, does not draw the gesture as the user is making it
    disableTrace: false,

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
