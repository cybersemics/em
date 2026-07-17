/** Geometry shared by the sidebar content-mask gradient (sidebarContentMask recipe) and the
 * transform pair that slides it (COMPOSITED SLIDING MASK in Sidebar.tsx). Single source of truth:
 * the recipe's gradient stops and Sidebar's slide offsets are the same three numbers, and letting
 * them drift apart mis-lands the fade (a permanent fade line at rest, or content leaking under the
 * open dropdown). No imports here — this module is pulled into both the Panda config (build time,
 * via the recipe) and the client bundle (via Sidebar.tsx).
 */

/** Height (px) of the mask's fully-transparent band — the region hidden under the open dropdown. */
export const DROPDOWN_MASK_BAND = 128

/** Height (px) of the mask's fade-to-black ramp. Doubles as the scroll-hint top fade. */
export const SCROLL_HINT_FADE = 48

/** Total gradient extent (px) beyond the masked box — the oversize that keeps every slide
 * position covered. */
export const MASK_OVERSIZE = DROPDOWN_MASK_BAND + SCROLL_HINT_FADE

/** The mask geometry as one object (the named exports are the intended API). */
export default { DROPDOWN_MASK_BAND, SCROLL_HINT_FADE, MASK_OVERSIZE }
