import { defineRecipe } from '@pandacss/dev'

export default defineRecipe({
  className: 'panelCommandRecipe',
  base: {
    all: 'unset',
    color: 'fgOverlay75',
    position: 'relative',
    boxSizing: 'border-box',
    padding: '0.444rem 0.889rem',
    // Use CSS variables for border radii
    '--panel-command-radius': '48px',
    '--panel-command-radius-inner': '24px',
    borderRadius: 'var(--panel-command-radius)',
    overflow: 'hidden',
    mixBlendMode: 'color-dodge',
    // Faint inner glow. Painted as the element's own background so it blends through the base
    // color-dodge above rather than needing a separate blended ::before layer — one fewer
    // backdrop-reading blend composite per button (these stack across every Command Center
    // button and mobile GPUs corrupt on too many). Formerly a `_before` pseudo-element.
    backgroundImage: `radial-gradient(
        121.9% 149.44% at 57.5% 55.06%,
        rgba(130, 108, 203, 0) 0%,
        rgba(127, 172, 255, 0.08) 100%
      )`,

    cursor: 'pointer',
    transition: 'opacity {durations.medium} ease, background-color {durations.medium} ease',
    opacity: 1,
    height: 60,

    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',

    _after: {
      content: '""',
      position: 'absolute',
      top: '0%',
      left: '0%',
      right: '0%',
      bottom: '0%',
      mixBlendMode: 'color-dodge',
      background: `radial-gradient(
            121.9% 149.44% at 57.5% 55.06%,
            {colors.panelCommandBorderGradientPurple} 0%,
            {colors.panelCommandBorderGradientBlue} 100%
          )
          padding-box,
        linear-gradient(
            182.54deg,
            {colors.panelCommandBorderGradientGray} 1.43%,
            {colors.panelCommandBorderGradientPurpleLight} 64.89%
          )
          border-box,
        linear-gradient(
            1.31deg,
            {colors.panelCommandBorderGradientGray} -39.43%,
            {colors.panelCommandBorderGradientPurpleLight} 24.83%
          )
          border-box`,
      borderRadius: 'var(--panel-command-radius)',
      border: '1px solid transparent',
      WebkitMask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
      WebkitMaskComposite: 'xor',
      maskComposite: 'exclude',
    },
    // Add pseudo-selector styling using CSS variables
    '.panelCommandGroupRecipe > div:first-of-type &, .panelCommandGroupRecipe > div:first-of-type &::after': {
      borderTopLeftRadius: 'var(--panel-command-radius)',
      borderTopRightRadius: 'var(--panel-command-radius-inner)',
      borderBottomRightRadius: 'var(--panel-command-radius-inner)',
      borderBottomLeftRadius: 'var(--panel-command-radius)',
    },
    '.panelCommandGroupRecipe > div:last-of-type &, .panelCommandGroupRecipe > div:last-of-type &::after': {
      borderTopRightRadius: 'var(--panel-command-radius)',
      borderTopLeftRadius: 'var(--panel-command-radius-inner)',
      borderBottomLeftRadius: 'var(--panel-command-radius-inner)',
      borderBottomRightRadius: 'var(--panel-command-radius)',
    },
    '.panelCommandGroupRecipe > div:not(:first-of-type):not(:last-of-type) &': {
      borderRadius: '0',
    },
  },
  variants: {
    isButtonExecutable: {
      true: {
        opacity: 1,
        cursor: 'pointer',
      },
      false: {
        opacity: 0.25,
      },
    },
  },
  defaultVariants: {
    isButtonExecutable: true,
  },
  staticCss: [
    {
      isButtonExecutable: ['true', 'false'],
    },
  ],
})
