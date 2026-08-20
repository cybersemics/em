import { defineRecipe } from '@pandacss/dev'

/**
 * Per-row "descend into the fog" styles for the last visible rows of the single-column Gesture Menu.
 * Depth 0 leaves the row untouched, while depths 1–4 fade progressively so that
 * hidden commands feel like they are emerging from fog. The step count matches
 * GESTURE_MENU_FOG_ROW_COUNT.
 */
const gestureMenuFogRecipe = defineRecipe({
  className: 'gesture-menu-fog',
  description: 'progressive fade applied to the trailing rows of the single-column Gesture Menu when it overflows',
  base: {
    // Fog transforms scale from the left edge so the translateX offset alone controls how far each
    // row has drifted right as it descends into the fog.
    transformOrigin: 'left center',
  },
  variants: {
    depth: {
      0: {},
      1: {
        transform: 'translateX(0.65rem) scale(0.875)',
        marginBottom: '-0.275rem',
        opacity: 0.875,
        filter: 'blur(1.5px)',
      },
      2: {
        transform: 'translateX(0.95rem) scale(0.85)',
        marginBottom: '-0.33rem',
        opacity: 0.8,
        filter: 'blur(2px)',
      },
      3: {
        transform: 'translateX(2.1rem) scale(0.825)',
        marginBottom: '-0.385rem',
        opacity: 0.7,
        filter: 'blur(2.5px)',
      },
      4: {
        transform: 'translateX(2.8rem) scale(0.75)',
        marginBottom: '-0.55rem',
        opacity: 0.45,
        filter: 'blur(3px)',
      },
    },
  },
  defaultVariants: {
    depth: 0,
  },
  // The depth is computed at runtime, so panda's static extraction cannot see which variants are used.
  staticCss: [{ depth: ['0', '1', '2', '3', '4'] }],
})

export default gestureMenuFogRecipe
