/* eslint-disable import/prefer-default-export */
import { token } from '../styled-system/tokens'
import { isTouch } from './browser'
import viewportStore from './stores/viewportStore'

/**
 * Returns true if the device is a touchscreen whose *smaller* viewport dimension is at least the `lg`
 * breakpoint ("landscape mobile devices and larger", 600px — approx the short edge of an iPad).
 *
 * Reads the live viewport size from `viewportStore` on every call, so the answer updates as the store
 * does (e.g. on rotation or window resize). Taking the minimum of the two dimensions is what excludes a
 * phone held in landscape: an iPhone 17 Pro is 874pt wide that way and clears `lg` on viewport width
 * alone, but `min(402, 874)` does not.
 */
export const isTablet = () => {
  const { innerWidth, innerHeight } = viewportStore.getState()

  return (
    isTouch && typeof window !== 'undefined' && Math.min(innerWidth, innerHeight) >= parseInt(token('breakpoints.lg'))
  )
}
