import { MotionValue, useTransform } from 'motion/react'
import { useState } from 'react'

/**
 * How much of the dialog's fade a backdrop blur takes to reach full opacity, at the start of opening and the end of
 * closing. 1 fades the blur with the panel; smaller values bring the blur in ahead of it.
 */
const BACKDROP_FADE_FRACTION = 1

/**
 * Reads the fade fraction once, when the dialog mounts.
 * TEMPORARY: --cu-blur-fade-share is dialed by CommandUniverseGlassDebugPanel.
 */
const readFadeFraction = () => {
  const dialed = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--cu-blur-fade-share'))
  return dialed > 0 ? dialed : BACKDROP_FADE_FRACTION
}

/**
 * The opacity for a dialog's backdrop-filter layers, derived from the dialog's own fade. By default the blur fades with
 * the panel. Bringing it to full opacity earlier hides the brief overlap of the sharp page and the blurred page that a
 * half-transparent blur shows, but at a quarter of the fade the blur landed well ahead of the panel and the open read
 * as abrupt.
 *
 * Fading the blur radius instead avoids the overlap entirely, but Chrome then re-renders every blur layer each frame and
 * parts of the screen dropped out for a frame at a time.
 */
const useBackdropOpacity = (opacity: MotionValue<number>): MotionValue<number> => {
  const [fraction] = useState(readFadeFraction)
  return useTransform(opacity, open => Math.min(1, open / fraction))
}

export default useBackdropOpacity
