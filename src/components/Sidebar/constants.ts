/** Constants shared across the Sidebar subcomponents. Constants used by a single component live
 * at the top of that component's module instead. */
import durations from '../../util/durations'

/** Fixed sidebar width on large devices (px). Small screens use 100vw. */
export const SIDEBAR_WIDTH_PX = 400

/** Default ease-out curve used for most sidebar animations. */
export const EASE_OUT = [0.16, 0.6, 0.2, 1] as const

/** CSS equivalent of EASE_OUT. */
export const cssEaseOut = `cubic-bezier(${EASE_OUT.join(', ')})`

/** Duration (seconds) of the dropdown open/close animation. */
export const STAGE_DURATION = durations.get('medium') / 1000

/** Duration (seconds) of the slower sidebar animations: the section hue/sat shift and the
 * glow overlay's resize on dropdown expand. */
export const SLOW_DURATION = durations.get('slow') / 1000
