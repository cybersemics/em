import { defineRecipe } from '@pandacss/dev'

/** Recipe that defines the static parts of the sidebar scrollable content mask.
 * A single mask gradient is used across all states (128px transparent band followed
 * by a 48px fade to black); mask-position-y and opacity are both animated imperatively
 * from Sidebar.tsx via framer-motion so the dropdown-hide slide and its accompanying
 * dim-out stay in lockstep through the asymmetric two-stage open/close timing. */
const sidebarContentMaskRecipe = defineRecipe({
  className: 'sidebar-content-mask',
  base: {
    maskRepeat: 'no-repeat',
    maskImage: 'linear-gradient(to bottom, transparent 0, transparent 128px, black 176px)',
    maskSize: '100% calc(100% + 176px)',
  },
})

export default sidebarContentMaskRecipe
