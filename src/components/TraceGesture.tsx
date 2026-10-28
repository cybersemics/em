import React, { useCallback, useEffect, useRef } from 'react'
import { useSelector } from 'react-redux'
import SignaturePad from 'react-signature-pad-wrapper'
import { css } from '../../styled-system/css'
import { gestureString, globalCommands } from '../commands'
import { GESTURE_GLOW_BLUR, Settings, noop } from '../constants'
import getUserSetting from '../selectors/getUserSetting'
import themeColors from '../selectors/themeColors'
import gestureStore from '../stores/gestureStore'
import viewportStore from '../stores/viewportStore'
import isInGestureZone from '../util/isInGestureZone'

interface TraceGestureProps {
  // Change the node to which pointer event handlers are attached. Defaults to the signature pad canvas.
  // This is necessary for gesture tracing since the signature pad canvas cannot be a descendant of Thoughts, and Thoughts cannot be a descendant of the canvas. Therefore, we cannot rely on event bubbling for both Thoughts and the signature pad canvas to receive pointer events. When an eventNode is given, signature_pad's internal _handlePointerStart and _handlePointerMove are added to eventNode and user-events:none is set on the signature pad canvas.
  eventNodeRef?: React.RefObject<HTMLElement | null>
}

type SignaturePadEventType = 'beginStroke' | 'endStroke' | 'beforeUpdateStroke' | 'afterUpdateStroke'

/** The point that SignaturePad draws, converted from a touch or pointer event. */
interface SignatureEvent {
  event: Event
  type: string
  x: number
  y: number
  pressure: number
}

/** Overriden SignaturePad ref to provide access to private members. Dangerous! Will break if SignaturePad internals change. Necessary to clear the canvas and apply drop shadow glow effect to signature. */
interface SignaturePadOverride {
  _handleTouchStart: (e: TouchEvent) => void
  _handleTouchMove: (e: TouchEvent) => void
  _handleTouchEnd: (e: TouchEvent) => void
  _handleTouchCancel: (e: TouchEvent) => void
  _handlePointerMove: (e: PointerEvent) => void
  _drawingStroke: boolean
  _strokeMoveUpdate: (event: SignatureEvent) => void
  _strokeEnd: (event: SignatureEvent, shouldUpdate?: boolean) => void
  _ctx: CanvasRenderingContext2D
  addEventListener: (event: SignaturePadEventType, listener: (e: Event) => void) => void
  canvas: HTMLCanvasElement
  clear: () => void
  removeEventListener: (event: SignaturePadEventType, listener: (e: Event) => void) => void
}

/** A hook that detects when there is a cancelled gesture in progress. Handles GestureHint and: DesktopCommandUniverseGesture which have different ways of showing a cancelled gesture. */
const useGestureCancelled = () => {
  const invalidGesture = gestureStore.useSelector(
    state =>
      state.gesture &&
      state.gestureMenuAnimationState !== 'hidden' &&
      !globalCommands.some(command => !command.hideFromHelp && gestureString(command) === state.gesture),
  )

  return invalidGesture
}

/** Draws a gesture as it is being performed onto a canvas. */
const TraceGesture = ({ eventNodeRef }: TraceGestureProps) => {
  const colors = useSelector(themeColors)
  const leftHanded = useSelector(getUserSetting(Settings.leftHanded))
  const show = gestureStore.useSelector(
    state => state.gesture.length > 0 && state.gestureMenuAnimationState !== 'exiting',
  )
  const cancelled = useGestureCancelled()
  const innerHeight = viewportStore.useSelector(state => state.innerHeight)
  const innerWidth = viewportStore.useSelector(state => state.innerWidth)
  const signaturePadRef = useRef<SignaturePad | null>(null)
  // the identifier of the first finger of the touch, which is the only finger that is traced
  const touchIdentifierRef = useRef<number | null>(null)

  // Clear the signature pad when the stroke starts.
  // This is easier than clearing when the stroke ends where we would have to account for the fade timeout.
  const onBeginStroke = useCallback(() => {
    if (!signaturePadRef.current) return

    const signaturePad = signaturePadRef.current['signaturePad'] as SignaturePadOverride

    signaturePad.clear()

    // add glow
    // TODO: WHy does GESTURE_GLOW_COLOR not work?
    signaturePad._ctx.shadowColor = colors.highlight
    signaturePad._ctx.shadowOffsetX = 0
    signaturePad._ctx.shadowOffsetY = 0
    signaturePad._ctx.shadowBlur = GESTURE_GLOW_BLUR
  }, [colors])

  // Resize the signature pad when the screen orientation changes.
  useEffect(() => {
    if (!signaturePadRef.current) return

    const signaturePad = signaturePadRef.current['signaturePad'] as SignaturePadOverride

    signaturePad.canvas.width = innerWidth
    signaturePad.canvas.height = innerHeight
  }, [innerHeight, innerWidth])

  /** Disable signaturePad’s preventDefault on move events since newer version of signaturePad breaks iOS native text-selection drag feature. See issue: https://github.com/cybersemics/em/issues/3483. */
  useEffect(() => {
    if (!signaturePadRef.current) return

    const signaturePad = signaturePadRef.current['signaturePad'] as SignaturePadOverride

    /** Neutralize the move handler to prevent the default behavior. */
    const neutralizeMoveHandler =
      <E extends Event>(handler: (e: E) => void) =>
      (e: E) => {
        const originalPreventDefault = e.preventDefault
        e.preventDefault = noop
        try {
          handler(e)
        } finally {
          e.preventDefault = originalPreventDefault
        }
      }

    signaturePad._handlePointerMove = neutralizeMoveHandler(signaturePad._handlePointerMove)
  }, [])

  /** Trace only the first finger of a touch. SignaturePad draws the first finger that changed in each event, and stops drawing when more than one finger is on the same element, so a finger that joins a gesture in progress would otherwise hijack the trace. Replaces SignaturePad's touch move and end handlers before any stroke begins, since SignaturePad adds them to the window when a stroke begins. The replacements also never call preventDefault, which breaks the iOS native text-selection drag on move (#3483) and tap-to-edit on end. See #5966. */
  useEffect(() => {
    if (!signaturePadRef.current) return

    const signaturePad = signaturePadRef.current['signaturePad'] as SignaturePadOverride

    /** Converts the first finger to a SignatureEvent, or returns undefined if the first finger did not change. */
    const firstFingerEvent = (e: TouchEvent): SignatureEvent | undefined => {
      const touch = Array.from(e.changedTouches).find(touch => touch.identifier === touchIdentifierRef.current)
      return touch && { event: e, type: e.type, x: touch.clientX, y: touch.clientY, pressure: touch.force }
    }

    signaturePad._handleTouchMove = (e: TouchEvent) => {
      const event = firstFingerEvent(e)
      if (!event) return
      if (!signaturePad._drawingStroke) {
        // removes the move and end listeners that remain on the window
        signaturePad._strokeEnd(event, false)
        return
      }
      signaturePad._strokeMoveUpdate(event)
    }

    signaturePad._handleTouchEnd = (e: TouchEvent) => {
      const event = firstFingerEvent(e)
      if (!event) return
      signaturePad._strokeEnd(event)
    }
  }, [])

  useEffect(() => {
    if (!signaturePadRef.current) return

    const eventNode = eventNodeRef?.current
    const signaturePad = signaturePadRef.current['signaturePad'] as SignaturePadOverride

    // update canvas dimensions, otherwise the initial height on load is too large for some reason
    // https://github.com/szimek/signature_pad/issues/118#issuecomment-146207233
    signaturePad.canvas.width = signaturePad.canvas.offsetWidth
    signaturePad.canvas.height = signaturePad.canvas.offsetHeight

    /** Forwards the touchstart event of the first finger to the signaturePad if in the gesture zone. */
    const onTouchStart = (e: TouchEvent) => {
      // Make preventDefault a noop otherwise tap-to-edit is broken.
      // e.cancelable is readonly and monkeypatching preventDefault is easier than copying e.
      e.preventDefault = noop

      // A finger that lands while another is down is never traced. If no gesture has begun, the touch is multi-touch,
      // which MultiGesture abandons, so stop tracing the first finger too.
      if (e.touches.length !== 1) {
        if (!gestureStore.getState().gesture) {
          signaturePad._handleTouchCancel(e)
        }
        return
      }

      const touch = e.touches[0]
      touchIdentifierRef.current = touch.identifier
      if (isInGestureZone(touch.clientX, touch.clientY, leftHanded)) {
        signaturePad._handleTouchStart(e)
      }
    }

    /** Forwards the touchmove event to the signaturePad if in the gesture zone. */
    const onTouchMove = (e: TouchEvent) => {
      const isGestureInProgress = gestureStore.getState().gesture.length > 0
      const touch = e.touches[0]

      if (isGestureInProgress && isInGestureZone(touch.clientX, touch.clientY, leftHanded)) {
        signaturePad._handleTouchMove(e)
      }
    }

    /** Forwards the touchend event to the signaturePad. */
    const onTouchEnd = (e: TouchEvent) => {
      signaturePad._handleTouchEnd(e)
    }

    /**
     * End the stroke when the gesture is cancelled.
     * Otherwise a stroke can be rendered from the bottom of the screen when switching apps on iPhone.
     */
    const onTouchCancel = (e: TouchEvent) => {
      // singaturePad.clear() is insufficient since the stroke has already begun. We need to end the stroke so that the touchmove handlers within signaturePad that draw the signature are removed.
      signaturePad._handleTouchEnd(e)
    }

    eventNode?.addEventListener('touchstart', onTouchStart)
    eventNode?.addEventListener('touchmove', onTouchMove)
    eventNode?.addEventListener('touchend', onTouchEnd)
    eventNode?.addEventListener('touchcancel', onTouchCancel)
    signaturePad.addEventListener('beginStroke', onBeginStroke)

    return () => {
      eventNode?.removeEventListener('touchstart', onTouchStart)
      eventNode?.removeEventListener('touchmove', onTouchMove)
      eventNode?.removeEventListener('touchend', onTouchEnd)
      eventNode?.removeEventListener('touchcancel', onTouchCancel)
      signaturePad.removeEventListener('beginStroke', onBeginStroke)
    }
  }, [eventNodeRef, onBeginStroke, leftHanded])

  return (
    <div
      data-testid='gesture-trace'
      className={css({
        zIndex: 'gestureTrace',
        position: 'fixed',
        top: 0,
        left: 0,
        // Dim the gesture trace to 50% opacity when the gesture is cancelled or invalid.
        opacity: show ? (cancelled ? 0.5 : 1) : 0,
        transition:
          show && !cancelled
            ? // Fade in quickly. A custom easing function is used to simulate a slight delay at the beginning. This effectively hides very quickly entered gestures like forward/backward.
              'opacity {durations.traceGestureIn} {easings.easeInSlow}'
            : // Fade out slowly.
              'opacity {durations.medium} ease-out',
        pointerEvents: eventNodeRef ? 'none' : undefined,
      })}
      style={{ height: innerHeight }}
    >
      <div
        className={css({ userSelect: 'none' })}
        // WebKitUserSelect needed in addition to userSelect in order to disable long-tap-to-select
        style={{ WebkitUserSelect: 'none' }}
      >
        <SignaturePad
          height={innerHeight}
          ref={signaturePadRef}
          options={{
            penColor: colors.fg,
          }}
        />
      </div>
    </div>
  )
}
/** Renders the TraceGesture component unless a modal or the mobile command universe is shown. */
const TraceGestureWrapper = (props: TraceGestureProps) => {
  const showModal = useSelector(state => state.showModal)
  const showMobileCommandUniverse = useSelector(state => state.showMobileCommandUniverse)
  return <>{!showModal && !showMobileCommandUniverse && <TraceGesture {...props} />}</>
}

export default TraceGestureWrapper
