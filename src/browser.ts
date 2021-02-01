/** Defines client/browser-specific variables that do not change over the course of a session. */

import { v4 as uuid } from 'uuid'

/** Returns true if the user's device is touch screen. */
export const isTouch = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches

/** Returns true if the navigator platform contains 'Linux armv71'. */
export const isAndroid = typeof navigator !== 'undefined' && navigator.platform === 'Linux armv7l'

/** Returns true if the navigator platform contains 'MacIntel'. */
export const isMac = typeof navigator !== 'undefined' && navigator.platform === 'MacIntel'

/** Returns true if the navigator vendor contains 'Apple'. */
export const isSafari = () => typeof navigator !== 'undefined' && navigator.vendor.includes('Apple')

/**
 * Use clientId to ignore value events from firebase originating from this client in this session.
 * This approach has a possible race condition though. See https://stackoverflow.com/questions/32087031/how-to-prevent-value-event-on-the-client-that-issued-set#comment100885493_32107959.
 */
export const clientId = uuid()
