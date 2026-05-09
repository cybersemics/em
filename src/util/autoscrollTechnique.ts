import storage from './storage'

/**
 * Temporary A/B toggle for issue #3765 — selects which technique is used to
 * suppress iOS native autoscroll on tap-to-focus:
 *
 * - 'v1': existing `preventAutoscroll` (transform/padding centering hack)
 * - 'v2': new `focusWithoutAutoscroll` (preventDefault + focus({preventScroll: true}))
 *
 * Persisted to localStorage so it survives the keyboard-induced reloads that
 * are common on iOS Capacitor during testing.
 *
 * Remove this file once the A/B is decided.
 */

export type AutoscrollTechnique = 'v1' | 'v2'

const STORAGE_KEY = 'debug-autoscroll-technique'
const DEFAULT: AutoscrollTechnique = 'v1'

const listeners = new Set<(t: AutoscrollTechnique) => void>()

const isValid = (value: string | null): value is AutoscrollTechnique => value === 'v1' || value === 'v2'

/** Read the current technique synchronously. Safe to call from anywhere — falls back to default on SSR. */
export const getAutoscrollTechnique = (): AutoscrollTechnique => {
  const raw = storage.getItem(STORAGE_KEY)
  return isValid(raw) ? raw : DEFAULT
}

/** Set the technique and notify subscribers. */
export const setAutoscrollTechnique = (technique: AutoscrollTechnique) => {
  storage.setItem(STORAGE_KEY, technique)
  listeners.forEach(l => l(technique))
}

/** Subscribe to changes. Returns an unsubscribe function. */
export const subscribeAutoscrollTechnique = (listener: (t: AutoscrollTechnique) => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
