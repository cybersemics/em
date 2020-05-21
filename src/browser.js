/** Defines client/browser-specific variables that do not change over the course of a session. */

import uuid from 'uuid/v4'

/** Returns true if the userAgent contains 'Mobile'. */
export const isMobile = /Mobile/.test(navigator.userAgent)

/** Returns true if the navigator platform contains 'Linux armv71'. */
export const isAndroid = navigator.platform === 'Linux armv7l'

/** Returns true if the navigator platform contains 'MacIntel'. */
export const isMac = navigator.platform === 'MacIntel'

/** Returns true if the navigator vendor contains 'Apple'. */
export const isSafari = () => navigator.vendor.includes('Apple')

/** Returns true if the browser supports touch events. */
export const isTouchEnabled = () => {
  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    navigator.msMaxTouchPoints > 0
  )
}

/**
 * Use clientId to ignore value events from firebase originating from this client in this session.
 * This approach has a possible race condition though. See https://stackoverflow.com/questions/32087031/how-to-prevent-value-event-on-the-client-that-issued-set#comment100885493_32107959
 */
export const clientId = uuid()
