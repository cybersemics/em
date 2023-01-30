import React, { useCallback, useEffect, useRef } from 'react'
import { useSelector } from 'react-redux'
import SignaturePad from 'react-signature-pad-wrapper'
import { CSSTransition } from 'react-transition-group'
import State from '../@types/State'
import { AlertType, EM_TOKEN, GESTURE_CANCEL_ALERT_TEXT } from '../constants'
import findDescendant from '../selectors/findDescendant'
import themeColors from '../selectors/themeColors'
import { gestureString, globalShortcuts } from '../shortcuts'
import { Ministore } from '../stores/ministore'
import viewportStore from '../stores/viewport'

interface TraceGestureProps {
  // Change the node to which pointer event handlers are attached. Defaults to the signature pad canvas.
  // This is necessary for gesture tracing since the signature pad canvas cannot be a descendant of Thoughts, and Thoughts cannot be a descendant of the canvas. Therefore, we cannot rely on event bubbling for both Thoughts and the signature pad canvas to receive pointer events. When an eventNode is given, signature_pad's internal _handlePointerStart and _handlePointerMove are added to eventNode and user-events:none is set on the signature pad canvas.
  eventNodeRef?: React.RefObject<HTMLElement>
  visibilityStore: Ministore<boolean>
}

/** Renders the TraceGesture component as long as it is not disabled in the settings. */
const TraceGestureWrapper = (props: TraceGestureProps) => {
  const disableGestureTracing = useSelector(
    (state: State) => !!findDescendant(state, EM_TOKEN, ['Settings', 'disableGestureTracing']),
  )
  return <>{!disableGestureTracing && <TraceGesture {...props} />}</>
}

/** Draws a gesture as it is being performed onto a canvas. */
const TraceGesture = ({ eventNodeRef, visibilityStore }: TraceGestureProps) => {
  const colors = useSelector(themeColors)

  // A hook that is true when there is a cancelled gesture in progress.
  // Handles GestureHint and GestureHintExtended which have different ways of showing a cancelled gesture.
  const cancelled = useSelector((state: State) => {
    const alert = state.alert
    if (!alert || !alert.value) return false
    // GestureHint
    else if (alert.alertType === AlertType.GestureHint && alert.value === GESTURE_CANCEL_ALERT_TEXT) return true
    // GestureHintExtended
    else if (alert.alertType === AlertType.GestureHintExtended) {
      // when the extended gesture hint is activated, the alert value is co-opted to store the gesture that is in progress
      return !globalShortcuts.some(
        shortcut => !shortcut.hideFromInstructions && gestureString(shortcut) === alert.value,
      )
    }

    return false
  })

  const show = visibilityStore.useState()
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

    const handlePointerStart = signaturePad._handlePointerStart.bind(signaturePad)
    const handlePointerMove = signaturePad._handlePointerMove.bind(signaturePad)
    if (eventNodeRef?.current) {
      eventNodeRef.current.addEventListener('pointerdown', handlePointerStart)
      eventNodeRef.current.addEventListener('pointermove', handlePointerMove)
    }

    signaturePad.addEventListener('beginStroke', onBeginStroke)

    // update canvas dimensions, otherwise the initial height on load is too large for some reason
    // https://github.com/szimek/signature_pad/issues/118#issuecomment-146207233
    signaturePad.canvas.width = signaturePad.canvas.offsetWidth
    signaturePad.canvas.height = signaturePad.canvas.offsetHeight

    return () => {
      if (eventNodeRef?.current) {
        eventNodeRef.current.removeEventListener('pointerdown', handlePointerStart)
        eventNodeRef.current.removeEventListener('pointermove', handlePointerMove)
      }
      signaturePad.removeEventListener('beginStroke', onBeginStroke)
    }
  }, [])

  return (
    <div
      className='z-index-gesture-trace'
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        height: innerHeight,
        // Dim the gesture trace to 50% opacity when the gesture is cancelled.
        // Also dim when hidden, otherwise when releasing a cancelled gesture the opacity briefly goes back to 1 to start the fade-both animation. This also has the effect of immediately dimming a valid (non-cancelled) gesture as soon as it is released, which actually looks pretty good.
        opacity: cancelled || !show ? 0.5 : 1,
        transition: 'opacity 150ms ease-in-out',
        pointerEvents: eventNodeRef ? 'none' : undefined,
      }}
    >
      <CSSTransition in={show} timeout={400} classNames='fade-both'>
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

export default TraceGestureWrapper
