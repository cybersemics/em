import React, { useCallback, useEffect, useRef } from 'react'
import { useSelector } from 'react-redux'
import SignaturePad from 'react-signature-pad-wrapper'
import { css } from '../../styled-system/css'
import { gestureString, globalCommands } from '../commands'
import { GESTURE_GLOW_BLUR, Settings, noop } from '../constants'
import getUserSetting from '../selectors/getUserSetting'
import themeColors from '../selectors/themeColors'
import gestureStore from '../stores/gesture'
import viewportStore from '../stores/viewport'
import isInGestureZone from '../util/isInGestureZone'

interface TraceGestureProps {
  // Change the node to which pointer event handlers are attached. Defaults to the signature pad canvas.
  // This is necessary for gesture tracing since the signature pad canvas cannot be a descendant of Thoughts, and Thoughts cannot be a descendant of the canvas. Therefore, we cannot rely on event bubbling for both Thoughts and the signature pad canvas to receive pointer events. When an eventNode is given, signature_pad's internal _handlePointerStart and _handlePointerMove are added to eventNode and user-events:none is set on the signature pad canvas.
  eventNodeRef?: React.RefObject<HTMLElement>
}

type SignaturePadEventType = 'beginStroke' | 'endStroke' | 'beforeUpdateStroke' | 'afterUpdateStroke'

/** Overriden SignaturePad ref to provide access to private members. Dangerous! Will break if SignaturePad internals change. Necessary to clear the canvas and apply drop shadow glow effect to signature. */
interface SignaturePadOverride {
  _handleTouchStart: (e: TouchEvent) => void
  _handleTouchMove: (e: TouchEvent) => void
  _handleTouchEnd: (e: TouchEvent) => void
  _ctx: CanvasRenderingContext2D
  addEventListener: (event: SignaturePadEventType, listener: (e: Event) => void) => void
  canvas: HTMLCanvasElement
  clear: () => void
  removeEventListener: (event: SignaturePadEventType, listener: (e: Event) => void) => void
}

/** A hook that detects when there is a cancelled gesture in progress. Handles GestureHint and: CommandPaletteGesture which have different ways of showing a cancelled gesture. */
const useGestureCancelled = () => {
  const showCommandPalette = useSelector(state => state.showCommandPalette)

  const invalidGesture = gestureStore.useSelector(
    state =>
      state.gesture &&
      showCommandPalette &&
      !globalCommands.some(command => !command.hideFromHelp && gestureString(command) === state.gesture),
  )

  return invalidGesture
}

/** Draws a gesture as it is being performed onto a canvas. */
const TraceGesture = ({ eventNodeRef }: TraceGestureProps) => {
  const colors = useSelector(themeColors)
  const leftHanded = useSelector(getUserSetting(Settings.leftHanded))
  const show = gestureStore.useSelector(state => state.gesture.length > 0)
  const cancelled = useGestureCancelled()
  const innerHeight = viewportStore.useSelector(state => state.innerHeight)
  const signaturePadRef = useRef<SignaturePad | null>(null)

  /** A small flag cancel the next stroke after touchcancel. Otherwise, opening the app switcher by swiping the bottom of the screen on iOS can accidentally draw a line from the bottom of the screen to the start of the gesture. */
  // https://github.com/cybersemics/em/issues/2921
  const cancelNextStroke = useRef(false)

  // Clear the signature pad when the stroke starts.
  // This is easier than clearing when the stroke ends where we would have to account for the fade timeout.
  const onBeginStroke = useCallback(
    (e: Event) => {
      // e.preventDefault() will prevent the stroke
      // reset the cancelNextStroke flag to re-enable
      if (!signaturePadRef.current || cancelNextStroke.current) {
        e.preventDefault()
        cancelNextStroke.current = false
        return
      }

      const signaturePad = signaturePadRef.current['signaturePad'] as SignaturePadOverride

      signaturePad.clear()

      // add glow
      // TODO: WHy does GESTURE_GLOW_COLOR not work?
      signaturePad._ctx.shadowColor = colors.highlight
      signaturePad._ctx.shadowOffsetX = 0
      signaturePad._ctx.shadowOffsetY = 0
      signaturePad._ctx.shadowBlur = GESTURE_GLOW_BLUR
    },
    [colors],
  )

  useEffect(() => {
    if (!signaturePadRef.current) return

    const eventNode = eventNodeRef?.current
    const signaturePad = signaturePadRef.current['signaturePad'] as SignaturePadOverride

    // update canvas dimensions, otherwise the initial height on load is too large for some reason
    // https://github.com/szimek/signature_pad/issues/118#issuecomment-146207233
    signaturePad.canvas.width = signaturePad.canvas.offsetWidth
    signaturePad.canvas.height = signaturePad.canvas.offsetHeight

    /** Forwards the touchstart event to the signaturePad if in the gesture zone. */
    const onTouchStart = (e: TouchEvent) => {
      // Make preventDefault a noop otherwise tap-to-edit is broken.
      // e.cancelable is readonly and monkeypatching preventDefault is easier than copying e.
      e.preventDefault = noop

      const touch = e.touches[0]
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
      // Make preventDefault a noop otherwise tap-to-edit is broken.
      // e.cancelable is readonly and monkeypatching preventDefault is easier than copying e.
      e.preventDefault = noop

      signaturePad._handleTouchEnd(e)
    }

    /**
     * Cancel the next stroke when touchcancel is triggered.
     * Otherwise a stroke can be rendered from the bottom of the screen when switching apps on iPhone.
     */
    const onTouchCancel = () => {
      cancelNextStroke.current = true
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
/** Renders the TraceGesture component as long as it is not disabled in the settings. */
const TraceGestureWrapper = (props: TraceGestureProps) => {
  const showModal = useSelector(state => state.showModal)
  const disableGestureTracing = useSelector(getUserSetting(Settings.disableGestureTracing))
  return <>{!disableGestureTracing && !showModal && <TraceGesture {...props} />}</>
}

export default TraceGestureWrapper
