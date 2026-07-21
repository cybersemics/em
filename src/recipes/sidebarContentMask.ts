import { defineRecipe } from '@pandacss/dev'
import { DROPDOWN_MASK_BAND, MASK_OVERSIZE } from './sidebarMaskGeometry'

/** Static mask shared by the translated carrier in Sidebar. */
const sidebarContentMaskRecipe = defineRecipe({
  className: 'sidebar-content-mask',
  base: {
    maskRepeat: 'no-repeat',
    maskImage: `linear-gradient(to bottom, transparent 0, transparent ${DROPDOWN_MASK_BAND}px, black ${MASK_OVERSIZE}px)`,
    maskSize: '100% 100%',
  },
})

export default sidebarContentMaskRecipe
