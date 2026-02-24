/**
 * Copyright (c) Nicolas Gallagher.
 *
 * Faithful TypeScript port of react-native-web's useResponderEvents/index.js
 * integrated into a View component wrapper.
 *
 * Registers components with the centralized ResponderSystem for gesture handling.
 */
import React, { HTMLAttributes, useEffect, useRef } from 'react'
import type { ResponderConfig } from './ResponderSystem'
import * as ResponderSystem from './ResponderSystem'
import type { PanResponderHandlers } from './index'

interface ResponderViewProps extends HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode
  panHandlers?: PanResponderHandlers
}

let idCounter = 0

/**
 * Converts PanResponderHandlers to a ResponderConfig compatible with the ResponderSystem.
 */
function toResponderConfig(panHandlers: PanResponderHandlers): ResponderConfig {
  return {
    onStartShouldSetResponder: panHandlers.onStartShouldSetResponder,
    onStartShouldSetResponderCapture: panHandlers.onStartShouldSetResponderCapture,
    onMoveShouldSetResponder: panHandlers.onMoveShouldSetResponder,
    onMoveShouldSetResponderCapture: panHandlers.onMoveShouldSetResponderCapture,
    onResponderGrant: panHandlers.onResponderGrant,
    onResponderReject: panHandlers.onResponderReject,
    onResponderMove: panHandlers.onResponderMove,
    onResponderRelease: panHandlers.onResponderRelease,
    onResponderStart: panHandlers.onResponderStart,
    onResponderEnd: panHandlers.onResponderEnd,
    onResponderTerminate: panHandlers.onResponderTerminate,
    onResponderTerminationRequest: panHandlers.onResponderTerminationRequest,
  }
}

/**
 * Converts DOM touch events to PressEvent format and calls PanResponder handlers.
 * Uses the centralized ResponderSystem (document-level event listeners) matching
 * the original react-native-web architecture.
 */
const ResponderView: React.FC<ResponderViewProps> = ({ children, panHandlers, ...props }) => {
  const ref = useRef<HTMLDivElement>(null)
  // Stable ID per component instance (matches useResponderEvents pattern)
  const idRef = useRef<number | null>(null)
  if (idRef.current == null) {
    idRef.current = idCounter++
  }
  const id = idRef.current
  const isAttachedRef = useRef(false)

  // This is a separate effect so it doesn't run when the config changes.
  // On initial mount, attach global listeners if needed.
  // On unmount, remove node potentially attached to the Responder System.
  useEffect(() => {
    ResponderSystem.attachListeners()
    return () => {
      ResponderSystem.removeNode(id)
    }
  }, [id])

  // Register and unregister with the Responder System as necessary
  useEffect(() => {
    if (!panHandlers) {
      if (isAttachedRef.current) {
        ResponderSystem.removeNode(id)
        isAttachedRef.current = false
      }
      return
    }

    const config = toResponderConfig(panHandlers)

    const requiresResponderSystem =
      config.onMoveShouldSetResponder != null ||
      config.onMoveShouldSetResponderCapture != null ||
      config.onStartShouldSetResponder != null ||
      config.onStartShouldSetResponderCapture != null

    const node = ref.current

    if (requiresResponderSystem && node) {
      ResponderSystem.addNode(id, node, config)
      isAttachedRef.current = true
    } else if (isAttachedRef.current) {
      ResponderSystem.removeNode(id)
      isAttachedRef.current = false
    }
  }, [panHandlers, id])

  // Handle onClickCapture separately (not part of the responder system).
  // PanResponder uses this to prevent click events after gestures.
  useEffect(() => {
    const element = ref.current
    if (!element || !panHandlers?.onClickCapture) return

    /** Captures click events and forwards to PanResponder's onClickCapture handler. */
    const handleClickCapture = (e: MouseEvent) => {
      if (panHandlers.onClickCapture) {
        // Convert DOM MouseEvent to React MouseEvent format.
        // Note: Spreading a DOM event does not copy prototype methods (stopPropagation, preventDefault),
        // so they must be explicitly delegated.
        const reactEvent = {
          currentTarget: e.currentTarget as HTMLElement,
          target: e.target as HTMLElement,
          stopPropagation: () => e.stopPropagation(),
          preventDefault: () => e.preventDefault(),
          type: e.type,
          timeStamp: e.timeStamp,
        } as unknown as React.MouseEvent<HTMLElement>
        panHandlers.onClickCapture(reactEvent)
      }
    }

    element.addEventListener('click', handleClickCapture, true)
    return () => {
      element.removeEventListener('click', handleClickCapture, true)
    }
  }, [panHandlers])

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
