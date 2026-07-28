/* eslint-disable import/prefer-default-export -- shared sidebar tuning constants; named exports by design */
import { isAndroid } from '../../browser'
import { DROPDOWN_MASK_BAND, SCROLL_HINT_FADE } from '../../constants'
import durations from '../../util/durations'

/** Default ease-out curve used for most sidebar animations. */
export const EASE_OUT = [0.16, 0.6, 0.2, 1] as const

/** CSS equivalent of EASE_OUT. */
export const cssEaseOut = `cubic-bezier(${EASE_OUT.join(', ')})`

/** Softer ease-out used when *closing* the sidebar. The less aggressive start prevents the
 * drawer from appearing to "jump" when the user releases a swipe. */
export const EASE_OUT_GENTLE = [0.25, 0.1, 0.25, 1] as const

/** Android uses one blur layer to avoid WebView compositing flicker. */
export const PROGRESSIVE_BLUR_LAYERS = isAndroid ? 1 : 4

/** Preserve a smooth trailing edge when Android uses one blur layer. */
export const PROGRESSIVE_BLUR_MIN = isAndroid ? 4 : 0

/** Duration (seconds) of the dropdown open/close animation. */
export const STAGE_DURATION = durations.get('medium') / 1000

/** Duration (seconds) of the slower sidebar animations: the section hue/sat shift and the
 * glow overlay's resize on dropdown expand. */
export const SLOW_DURATION = durations.get('slow') / 1000

/** Position the shared mask geometry relative to the scroll area's top edge. */
export const DROPDOWN_MASK_OFFSET = -DROPDOWN_MASK_BAND
export const SCROLL_HINT_MASK_OFFSET = -SCROLL_HINT_FADE

/** Fixed sidebar width on large devices (px). Small screens use 100vw. */
export const SIDEBAR_WIDTH_PX = 400
