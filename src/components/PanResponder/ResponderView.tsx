import React, { HTMLAttributes, useEffect, useRef } from 'react'
import { useSelector } from 'react-redux'
import { Settings } from '../../constants'
import getUserSetting from '../../selectors/getUserSetting'
import isInGestureZone from '../../util/isInGestureZone'
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
  const leftHanded = useSelector(getUserSetting(Settings.leftHanded))

  useEffect(() => {
    const element = ref.current
    if (!element || !panHandlers) return

    /**
     * Handles touch start events.
     */
    const handleTouchStart = (e: TouchEvent) => {
      if (!panHandlers) return

      const pressEvent = createPressEventFromTouchEvent(e, element)

      // Check if touch is in gesture zone before preventing default
      const touch = e.touches[0]
      const inGestureZone = touch ? isInGestureZone(touch.clientX, touch.clientY, leftHanded) : false

      const shouldStartCapture = panHandlers.onStartShouldSetResponderCapture?.(pressEvent) || false
      const shouldStart = shouldStartCapture || panHandlers.onStartShouldSetResponder?.(pressEvent) || false

      if (shouldStart && !isResponderRef.current) {
        isResponderRef.current = true
        const shouldBlock = panHandlers.onResponderGrant?.(pressEvent)
        if (shouldBlock !== false) {
          panHandlers.onResponderStart?.(pressEvent)
          // Only prevent default if in gesture zone (allow scrolling in scroll zone)
          if (inGestureZone) {
            e.preventDefault()
          }
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

      // Check if touch is in gesture zone before preventing default
      const touch = e.touches[0]
      const inGestureZone = touch ? isInGestureZone(touch.clientX, touch.clientY, leftHanded) : false

      if (!isResponderRef.current) {
        const shouldMoveCapture = panHandlers.onMoveShouldSetResponderCapture?.(pressEvent) || false
        const shouldMove = shouldMoveCapture || panHandlers.onMoveShouldSetResponder?.(pressEvent) || false

        if (shouldMove) {
          isResponderRef.current = true
          const shouldBlock = panHandlers.onResponderGrant?.(pressEvent)
          if (shouldBlock !== false) {
            panHandlers.onResponderStart?.(pressEvent)
            // Only prevent default if in gesture zone (allow scrolling in scroll zone)
            if (inGestureZone) {
              e.preventDefault()
            }
            // Don't stop propagation
            panHandlers.onResponderMove?.(pressEvent)
          }
        }
        return
      }

      // Only prevent default if in gesture zone (allow scrolling in scroll zone)
      if (inGestureZone) {
        e.preventDefault()
      }
      // Don't stop propagation
      panHandlers.onResponderMove?.(pressEvent)
    }

    /**
     * Handles touch end events.
     */
    const handleTouchEnd = (e: TouchEvent) => {
      if (!panHandlers || !isResponderRef.current) return

      const pressEvent = createPressEventFromTouchEvent(e, element)
      panHandlers.onResponderRelease?.(pressEvent)
      panHandlers.onResponderEnd?.(pressEvent)
      isResponderRef.current = false
    }

    /**
     * Handles touch cancel events.
     */
    const handleTouchCancel = (e: TouchEvent) => {
      if (!panHandlers || !isResponderRef.current) return

      const pressEvent = createPressEventFromTouchEvent(e, element)
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
        // Convert DOM MouseEvent to React MouseEvent format
        const reactEvent = {
          ...e,
          currentTarget: e.currentTarget as HTMLElement,
          target: e.target as HTMLElement,
        } as unknown as React.MouseEvent<HTMLElement>
        panHandlers.onClickCapture(reactEvent)
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
  }, [panHandlers, leftHanded])

  const { style, ...otherProps } = props

  // Layout-transparent wrapper - only handles touch events without affecting layout.
  // No flex or positioning styles to avoid layout shifts.
  const viewStyle: React.CSSProperties = {
    boxSizing: 'border-box',
    ...style,
  }

  return (
    <div ref={ref} {...otherProps} style={viewStyle}>
      {children}
    </div>
  )
}

export default ResponderView
