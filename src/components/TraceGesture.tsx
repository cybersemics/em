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

/** A hook that detects when there is a cancelled gesture in progress. Handles GestureHint and: CommandPaletteGesture which have different ways of showing a cancelled gesture. */
const useGestureCancelled = () => {
  const showCommandPalette = useSelector(state => state.showCommandPalette)

  const invalidGesture = gestureStore.useSelector(
    gesturePath =>
      gesturePath &&
      showCommandPalette &&
      !globalCommands.some(command => !command.hideFromHelp && gestureString(command) === gesturePath),
  )

  return invalidGesture
}

/** Draws a gesture as it is being performed onto a canvas. */
const TraceGesture = ({ eventNodeRef }: TraceGestureProps) => {
  const colors = useSelector(themeColors)
  const leftHanded = useSelector(getUserSetting(Settings.leftHanded))
  const show = gestureStore.useSelector(gesturePath => gesturePath.length > 0)
  const cancelled = useGestureCancelled()
  const innerHeight = viewportStore.useSelector(state => state.innerHeight)
  const signaturePadRef = useRef<SignaturePad | null>(null)

  // Clear the signature pad when the stroke starts.
  // This is easier than clearing when the stroke ends where we would have to account for the fade timeout.
  const onBeginStroke = useCallback(() => {
    if (!signaturePadRef.current) return
    // use bracket notation to access private member variable
    const signaturePad = signaturePadRef.current['signaturePad']
    signaturePad.clear()

    // add glow
    // TODO: WHy does GESTURE_GLOW_COLOR not work?
    signaturePad._ctx.shadowColor = colors.highlight
    signaturePad._ctx.shadowOffsetX = 0
    signaturePad._ctx.shadowOffsetY = 0
    signaturePad._ctx.shadowBlur = GESTURE_GLOW_BLUR
  }, [colors])

  useEffect(() => {
    if (!signaturePadRef.current) return
    // use bracket notation to access private member variable
    const signaturePad = signaturePadRef.current['signaturePad']
    const eventNode = eventNodeRef?.current

    // Attach touch handlers to a provided node rather than the signature pad canvas.
    // See: eventNodeRef
    const handleTouchStart = signaturePad._handleTouchStart.bind(signaturePad)
    const handleTouchMove = signaturePad._handleTouchMove.bind(signaturePad)
    const handleTouchEnd = signaturePad._handleTouchEnd.bind(signaturePad)

    eventNode?.addEventListener('touchstart', e => {
      // Make preventDefault a noop otherwise tap-to-edit is broken.
      // e.cancelable is readonly and monkeypatching preventDefault is easier than copying e.
      e.preventDefault = noop

      const touch = e.touches[0]
      if (isInGestureZone(touch.clientX, touch.clientY, leftHanded)) {
        handleTouchStart(e)
      }
    })

    eventNode?.addEventListener('touchmove', e => {
      const isGestureInProgress = gestureStore.getState().length > 0
      const touch = e.touches[0]

      if (isGestureInProgress && isInGestureZone(touch.clientX, touch.clientY, leftHanded)) {
        handleTouchMove(e)
      }
    })

    eventNode?.addEventListener('touchend', e => {
      // Make preventDefault a noop otherwise tap-to-edit is broken.
      // e.cancelable is readonly and monkeypatching preventDefault is easier than copying e.
      e.preventDefault = noop

      handleTouchEnd(e)
    })

    signaturePad.addEventListener('beginStroke', onBeginStroke)

    // update canvas dimensions, otherwise the initial height on load is too large for some reason
    // https://github.com/szimek/signature_pad/issues/118#issuecomment-146207233
    signaturePad.canvas.width = signaturePad.canvas.offsetWidth
    signaturePad.canvas.height = signaturePad.canvas.offsetHeight

    return () => {
      eventNode?.removeEventListener('touchstart', handleTouchStart)
      eventNode?.removeEventListener('touchmove', handleTouchMove)
      eventNode?.removeEventListener('touchend', handleTouchEnd)
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
  const showDialog = useSelector(state => state.dialogOpen)
  const disableGestureTracing = useSelector(getUserSetting(Settings.disableGestureTracing))
  return <>{!disableGestureTracing && !showModal && !showDialog && <TraceGesture {...props} />}</>
}

export default TraceGestureWrapper
