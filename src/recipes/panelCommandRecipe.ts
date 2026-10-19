import { defineRecipe } from '@pandacss/dev'

export default defineRecipe({
  className: 'panelCommandRecipe',
  base: {
    all: 'unset',
    color: 'fgOverlay75',
    position: 'relative',
    boxSizing: 'border-box',
    // The horizontal padding is fixed rather than rem, so that a larger font size does not squeeze the icon out of the button. See CommandCenter.
    padding: '0.444rem 14.224px',
    // Use CSS variables for border radii
    // The button's width is bound to the screen by the Command Center's four columns. Its height follows the font size, but only as far as the button keeps its pill shape: a small button is 60px tall on a 79px column at the default font size on a phone, so its height never exceeds 0.76 of the column's width. Any taller and, with the width fixed, it would round off towards a circle. The cap never goes below 60px, the height at the default font size, so on a phone narrower than about 388px the buttons stay as tall as they are at the default size rather than shrinking below it. 100cqw is the width of the Command Center's grid, less its three 9.952px gaps. 3.75rem is 60px at the default font size.
    '--panel-command-height': 'min(3.75rem, max(60px, calc((100cqw - 3 * 9.952px) / 4 * 0.76)))',
    // The radii follow the height, so the button keeps its shape as it grows: fully round on the outside, and a quarter of the height on the inside of a grouped pair. At the default 60px height these are the 30px and 15px that 48px and 24px used to resolve to once the browser scaled them to fit.
    '--panel-command-radius': 'calc(var(--panel-command-height) / 2)',
    '--panel-command-radius-inner': 'calc(var(--panel-command-height) / 4)',
    borderRadius: 'var(--panel-command-radius)',
    overflow: 'hidden',
    mixBlendMode: 'color-dodge',
    // Paint the glow in the background to avoid another blended layer on mobile GPUs.
    backgroundImage: `radial-gradient(
        121.9% 149.44% at 57.5% 55.06%,
        rgba(130, 108, 203, 0) 0%,
        rgba(127, 172, 255, 0.08) 100%
      )`,

    cursor: 'pointer',
    transition: 'opacity {durations.medium} ease, background-color {durations.medium} ease',
    opacity: 1,
    height: 'var(--panel-command-height)',

    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',

    // The icon and label are dimmed individually when the command is not executable, so they need their own transition.
    '& > *': {
      transition: 'opacity {durations.medium} ease',
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
        // Dim only the icon and label. Dimming the button itself would fade the ::after border gradient with it, and the border glow should remain at full strength when the command is disabled.
        '& > *': {
          opacity: 0.25,
        },
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
