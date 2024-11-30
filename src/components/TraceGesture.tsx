import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useSelector } from 'react-redux'
import SignaturePad from 'react-signature-pad-wrapper'
import { css } from '../../styled-system/css'
import { AlertType, GESTURE_CANCEL_ALERT_TEXT, GESTURE_GLOW_BLUR, Settings, noop } from '../constants'
import getUserSetting from '../selectors/getUserSetting'
import themeColors from '../selectors/themeColors'
import { gestureString, globalShortcuts } from '../shortcuts'
import gestureStore from '../stores/gesture'
import viewportStore from '../stores/viewport'
import isInGestureZone from '../util/isInGestureZone'

interface TraceGestureProps {
  // Change the node to which pointer event handlers are attached. Defaults to the signature pad canvas.
  // This is necessary for gesture tracing since the signature pad canvas cannot be a descendant of Thoughts, and Thoughts cannot be a descendant of the canvas. Therefore, we cannot rely on event bubbling for both Thoughts and the signature pad canvas to receive pointer events. When an eventNode is given, signature_pad's internal _handlePointerStart and _handlePointerMove are added to eventNode and user-events:none is set on the signature pad canvas.
  eventNodeRef?: React.RefObject<HTMLElement>
}
/** A hook that returns true a given number of milliseconds after its condition is set to true. Returns false immediately if the condition becomes false. */
const useConditionDelay = (condition: boolean, milliseconds: number) => {
  const [value, setValue] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    clearTimeout(timer.current!)
    if (condition) {
      timer.current = setTimeout(() => {
        setValue(true)
      }, milliseconds)
    } else {
      setValue(false)
    }
  }, [condition, milliseconds])

  return value
}
/** Draws a gesture as it is being performed onto a canvas. */
const TraceGesture = ({ eventNodeRef }: TraceGestureProps) => {
  const colors = useSelector(themeColors)
  const leftHanded = useSelector(getUserSetting(Settings.leftHanded))

  // A hook that is true when there is a cancelled gesture in progress.
  // Handles GestureHint and CommandPaletteGesture which have different ways of showing a cancelled gesture.
  const cancelled = useSelector(state => {
    const alert = state.alert
    if (!alert || !alert.value) return false
    // GestureHint
    else if (alert.alertType === AlertType.GestureHint && alert.value === GESTURE_CANCEL_ALERT_TEXT) return true
    // CommandPaletteGesture
    else if (state.showCommandPalette) {
      // when the command palette is activated, the alert value is co-opted to store the gesture that is in progress
      return !globalShortcuts.some(shortcut => !shortcut.hideFromHelp && gestureString(shortcut) === alert.value)
    }

    return false
  })

  const gestureStarted = gestureStore.useSelector(gesturePath => gesturePath.length > 0)
  // 100 millisecond delay before gesture trace is rendered feels about right given the fade in
  // it correctly avoids rendering quick gestures like back/forward
  const show = useConditionDelay(gestureStarted, 100)
  const innerHeight = viewportStore.useSelector(state => state.innerHeight)
  const signaturePadRef = useRef<{ minHeight: number; signaturePad: SignaturePad['signaturePad'] } | null>(null)
  const fadeTimer = useRef(0)

  // Clear the signature pad when the stroke starts.
  // This is easier than clearing when the stroke ends where we would have to account for the fade timeout.
  const onBeginStroke = useCallback(() => {
    clearTimeout(fadeTimer.current)
    if (!signaturePadRef.current) return
    const signaturePad = signaturePadRef.current.signaturePad
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
    const signaturePad = signaturePadRef.current.signaturePad
    const eventNode = eventNodeRef?.current

    // Attach pointer handlers to a provided node rather than the signature pad canvas.
    // See: eventNodeRef
    const handlePointerStart = signaturePad._handlePointerStart.bind(signaturePad)
    const handlePointerMove = signaturePad._handlePointerMove.bind(signaturePad)

    eventNode?.addEventListener('pointerdown', e => {
      // Make preventDefault a noop otherwise tap-to-edit is broken.
      // e.cancelable is readonly and monkeypatching preventDefault is easier than copying e.
      e.preventDefault = noop
      const shouldActivateGesture = isInGestureZone(e.clientX, e.clientY, leftHanded)
      if (shouldActivateGesture) {
        handlePointerStart(e)
      }
    })
    eventNode?.addEventListener('pointermove', e => {
      e.preventDefault = noop
      handlePointerMove(e)
    })

    signaturePad.addEventListener('beginStroke', onBeginStroke)

    // update canvas dimensions, otherwise the initial height on load is too large for some reason
    // https://github.com/szimek/signature_pad/issues/118#issuecomment-146207233
    signaturePad.canvas.width = signaturePad.canvas.offsetWidth
    signaturePad.canvas.height = signaturePad.canvas.offsetHeight

    return () => {
      eventNode?.removeEventListener('pointerdown', handlePointerStart)
      eventNode?.removeEventListener('pointermove', handlePointerMove)
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
        // Dim the gesture trace to 50% opacity when the gesture is cancelled.
        opacity: show ? (cancelled ? 0.5 : 1) : 0,
        transition: show
          ? 'opacity {durations.traceOpacityDuration} ease-in-out'
          : 'opacity {durations.mediumDuration} ease-in-out',
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
          // TODO: Fix type
          ref={signaturePadRef as any}
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
