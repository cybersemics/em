import { defineRecipe } from '@pandacss/dev'

/** Recipe that defines the a gradient mask for the sidebar's scrollable content area.
 * Fades out content beneath the section picker dropdown when open (120px ramp),
 * and provides a shorter scroll-hint fade (48px) when the content area is scrolled. */
const sidebarContentMaskRecipe = defineRecipe({
  className: 'sidebar-content-mask',
  base: {
    maskRepeat: 'no-repeat',
  },
  variants: {
    dropdownOpen: {
      true: {
        maskImage: 'linear-gradient(to bottom, transparent 128px, black)',
        maskPosition: '0 0',
        maskSize: '100% calc(100% + 48px)',
        transition:
          'mask-position {durations.fast} ease-out, -webkit-mask-position {durations.fast} ease-out, mask-image {durations.medium} ease-out, -webkit-mask-image {durations.medium} ease-out',
      },
      false: {
        maskImage: 'linear-gradient(to bottom, transparent, black 48px)',
        maskSize: '100% calc(100% + 48px)',
        transition:
          'mask-position {durations.fast} ease-out, -webkit-mask-position {durations.fast} ease-out, mask-image {durations.medium} ease-out, -webkit-mask-image {durations.medium} ease-out',
      },
    },
    isScrolled: {
      true: {
        maskPosition: '0 0',
      },
      false: {},
    },
  },
  compoundVariants: [
    {
      dropdownOpen: false,
      isScrolled: false,
      css: {
        maskPosition: '0 -48px',
      },
    },
  ],
  staticCss: ['*'],
})

export default sidebarContentMaskRecipe
