import { defineRecipe } from '@pandacss/dev'

export default defineRecipe({
  className: 'panelCommandRecipe',
  base: {
    all: 'unset',
    color: 'fgOverlay75',
    position: 'relative',
    boxSizing: 'border-box',
    padding: '0.5rem 1rem',
    // Use CSS variables for border radii
    '--panel-command-radius': '48px',
    '--panel-command-radius-inner': '24px',
    borderRadius: 'var(--panel-command-radius)',
    overflow: 'hidden',
    mixBlendMode: 'color-dodge',

    cursor: 'pointer',
    transition: 'opacity {durations.medium} ease, background-color {durations.medium} ease',
    opacity: 1,
    height: 60,

    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',

    _before: {
      content: '""',
      position: 'absolute',
      top: '0%',
      left: '0%',
      right: '0%',
      bottom: '0%',
      mixBlendMode: 'color-dodge',
      background: `radial-gradient(
        121.9% 149.44% at 57.5% 55.06%,
        rgba(130, 108, 203, 0) 0%,
        rgba(127, 172, 255, 0.08) 100%
      )`,
    },
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
            rgba(130, 108, 203, 0) 0%,
            rgba(127, 172, 255, 0.08) 100%
          )
          padding-box,
        linear-gradient(
            182.54deg,
            rgba(186, 187, 187, 0.26) 1.43%,
            rgba(208, 210, 224, 0) 64.89%
          )
          border-box,
        linear-gradient(
            1.31deg,
            rgba(186, 187, 187, 0.26) -39.43%,
            rgba(208, 210, 224, 0) 24.83%
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
