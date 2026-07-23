/** Mask dimensions shared by the Panda recipe and Sidebar. */

/** Height (px) of the mask's fully-transparent band — the region hidden under the open dropdown. */
export const DROPDOWN_MASK_BAND = 128

/** Height (px) of the mask's fade-to-black ramp. Doubles as the scroll-hint top fade. */
export const SCROLL_HINT_FADE = 48

/** Extra carrier extent (px) beyond the scroll viewport — keeps every mask slide position covered. */
export const MASK_OVERSIZE = DROPDOWN_MASK_BAND + SCROLL_HINT_FADE

export default { DROPDOWN_MASK_BAND, SCROLL_HINT_FADE, MASK_OVERSIZE }
