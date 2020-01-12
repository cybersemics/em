/** Defines client/browser-specific variables that do not change over the course of a session. */

import uuid from 'uuid/v4'

export const isMobile = /Mobile/.test(navigator.userAgent)
export const isAndroid = navigator.platform === 'Linux armv7l'
export const isMac = navigator.platform === 'MacIntel'
export const isTouchEnabled = () => {
  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    navigator.msMaxTouchPoints > 0
  )
}

// Use clientId to ignore value events from firebase originating from this client in this session
// This approach has a possible race condition though. See https://stackoverflow.com/questions/32087031/how-to-prevent-value-event-on-the-client-that-issued-set#comment100885493_32107959
export const clientId = uuid()
