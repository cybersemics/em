import { defineRecipe } from '@pandacss/dev'
import { DROPDOWN_MASK_BAND, MASK_OVERSIZE } from './sidebarMaskGeometry'

/** Recipe for the sidebar scrollable content mask. A single STATIC mask gradient fills the carrier
 * created in Sidebar.tsx, which extends beyond the scroll viewport by MASK_OVERSIZE (a transparent
 * band followed by a fade to black; see sidebarMaskGeometry for the shared numbers). The
 * counter-translated scroller therefore stays inside the carrier's border box at every animation
 * position, keeping the mask's compositing bounds fixed. The mask itself never animates or
 * repaints: Sidebar.tsx slides it with a compositor transform pair — the mask-bearing wrapper
 * translates while the scroller inside counter-translates, so the gradient glides over
 * pixel-stationary content — and dims the scroller with a CSS opacity transition, keeping the
 * whole effect on the GPU (mask-position animation re-rasterized the list every frame; see
 * COMPOSITED SLIDING MASK in Sidebar.tsx). */
const sidebarContentMaskRecipe = defineRecipe({
  className: 'sidebar-content-mask',
  base: {
    maskRepeat: 'no-repeat',
    maskImage: `linear-gradient(to bottom, transparent 0, transparent ${DROPDOWN_MASK_BAND}px, black ${MASK_OVERSIZE}px)`,
    maskSize: '100% 100%',
  },
})

export default sidebarContentMaskRecipe
