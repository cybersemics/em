import React, { HTMLAttributes, useEffect, useRef } from 'react'
import { createPressEventFromTouchEvent } from './ResponderAdapter'
import type { PanResponderHandlers } from './index'

interface ResponderViewProps extends HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode
  panHandlers?: PanResponderHandlers
}

/**
 * Converts DOM touch events to PressEvent format and calls PanResponder handlers.
 * Layout-transparent wrapper that only handles touch events without affecting layout.
 */
const ResponderView: React.FC<ResponderViewProps> = ({ children, panHandlers, ...props }) => {
  const ref = useRef<HTMLDivElement>(null)
  const isResponderRef = useRef(false)

  useEffect(() => {
    const element = ref.current
    if (!element || !panHandlers) return

    /**
     * Handles touch start events.
     */
    const handleTouchStart = (e: TouchEvent) => {
      if (!panHandlers) return

      const pressEvent = createPressEventFromTouchEvent(e, element)

      const shouldStartCapture = panHandlers.onStartShouldSetResponderCapture?.(pressEvent) || false
      const shouldStart = shouldStartCapture || panHandlers.onStartShouldSetResponder?.(pressEvent) || false

      if (shouldStart && !isResponderRef.current) {
        isResponderRef.current = true
        const shouldBlock = panHandlers.onResponderGrant?.(pressEvent)
        if (shouldBlock !== false) {
          panHandlers.onResponderStart?.(pressEvent)
          e.preventDefault()
          // Don't stop propagation - allow events to reach child elements (e.g., TraceGesture)
        }
      }
    }

    /**
     * Handles touch move events.
     */
    const handleTouchMove = (e: TouchEvent) => {
      if (!panHandlers) return

      const pressEvent = createPressEventFromTouchEvent(e, element)

      if (!isResponderRef.current) {
        const shouldMoveCapture = panHandlers.onMoveShouldSetResponderCapture?.(pressEvent) || false
        const shouldMove = shouldMoveCapture || panHandlers.onMoveShouldSetResponder?.(pressEvent) || false

        if (shouldMove) {
          isResponderRef.current = true
          const shouldBlock = panHandlers.onResponderGrant?.(pressEvent)
          if (shouldBlock !== false) {
            panHandlers.onResponderStart?.(pressEvent)
            // Don't prevent default here - let MultiGesture handle scroll prevention via document.body listener
            // Don't stop propagation
            panHandlers.onResponderMove?.(pressEvent)
          }
        }
        return
      }

      // Don't prevent default here
      // Let MultiGesture handle scroll prevention via document.body listener

      // Don't stop propagation
      panHandlers.onResponderMove?.(pressEvent)
    }

    /**
     * Handles touch end events.
     */
    const handleTouchEnd = (e: TouchEvent) => {
      // Always process the event to update touch history (calls removeTouchTrack).
      // Without this, taps (touchstart → touchend with no move) leave stale
      // "active" entries in the touch history, corrupting numberActiveTouches
      // and centroid calculations for subsequent gestures.
      const pressEvent = createPressEventFromTouchEvent(e, element)

      if (!panHandlers || !isResponderRef.current) return

      panHandlers.onResponderRelease?.(pressEvent)
      panHandlers.onResponderEnd?.(pressEvent)
      isResponderRef.current = false
    }

    /**
     * Handles touch cancel events.
     */
    const handleTouchCancel = (e: TouchEvent) => {
      // Always process the event to update touch history (calls removeTouchTrack).
      const pressEvent = createPressEventFromTouchEvent(e, element)

      if (!panHandlers || !isResponderRef.current) return

      const shouldTerminate = panHandlers.onResponderTerminationRequest?.(pressEvent) ?? true

      if (shouldTerminate) {
        panHandlers.onResponderTerminate?.(pressEvent)
        isResponderRef.current = false
      }
    }

    /**
     * Handles click capture events.
     */
    const handleClickCapture = (e: MouseEvent) => {
      if (panHandlers.onClickCapture) {
        // Cast native MouseEvent directly rather than spreading it.
        // Spreading a native event object does not copy prototype methods
        // (stopPropagation, preventDefault), which causes TypeError on iOS.
        panHandlers.onClickCapture(e as unknown as React.MouseEvent<HTMLElement>)
      }
    }

    // Use capture phase and non-passive listeners to allow preventDefault()
    element.addEventListener('touchstart', handleTouchStart, { capture: true, passive: false })
    element.addEventListener('touchmove', handleTouchMove, { capture: true, passive: false })
    element.addEventListener('touchend', handleTouchEnd, { capture: true, passive: false })
    element.addEventListener('touchcancel', handleTouchCancel, { capture: true, passive: false })
    element.addEventListener('click', handleClickCapture, true)

    return () => {
      element.removeEventListener('touchstart', handleTouchStart, { capture: true } as EventListenerOptions)
      element.removeEventListener('touchmove', handleTouchMove, { capture: true } as EventListenerOptions)
      element.removeEventListener('touchend', handleTouchEnd, { capture: true } as EventListenerOptions)
      element.removeEventListener('touchcancel', handleTouchCancel, { capture: true } as EventListenerOptions)
      element.removeEventListener('click', handleClickCapture, true)
      isResponderRef.current = false
    }
  }, [panHandlers])

  const { style, ...otherProps } = props

  // Match react-native-web's View defaults for consistent cross-platform touch behavior.
  // touch-action: manipulation is critical on iOS — it eliminates the 300ms tap delay
  // and standardizes how the browser handles touch sequences, preventing WKWebView (Capacitor)
  // and newer Safari versions from aggressively claiming touches for native gestures.
  const viewStyle: React.CSSProperties = {
    boxSizing: 'border-box',
    touchAction: 'manipulation',
    ...style,
  }

  return (
    <div ref={ref} {...otherProps} style={viewStyle}>
      {children}
    </div>
  )
}

export default ResponderView
