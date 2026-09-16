import { defineSlotRecipe } from '@pandacss/dev'

/** The positioned blur, glow, and content layers shared by bottom-screen notifications. */
const notificationRecipe = defineSlotRecipe({
  className: 'notification',
  slots: ['container', 'glow', 'content'],
  base: {
    container: {
      position: 'fixed',
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 'notification',
      display: 'flex',
      pointerEvents: 'none',
      userSelect: 'none',
      _dragHold: { pointerEvents: 'none' },
      '& [data-notification-blur]': {
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
      },
      '& [data-notification-blur-mobile], & [data-notification-blur-desktop]': {
        display: 'none',
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
      },
      '& [data-notification-blur-desktop]': {
        left: 'auto',
        width: 800,
      },
      '& [data-notification-gradient]': {
        position: 'absolute',
        inset: 0,
        background: 'linear-gradient(180deg, {colors.bgTransparent} 0%, {colors.bg} 100%)',
      },
      '& [data-notification-opacity-wrapper]': {
        position: 'relative',
        display: 'flex',
        width: '100%',
      },
    },
    glow: {
      position: 'absolute',
      pointerEvents: 'none',
      opacity: 1,
      backgroundRepeat: 'no-repeat',
      backgroundSize: 'cover',
      backgroundPosition: 'top right',
      height: 'calc(100% + 64px)',
      filter: 'blur(8px)',
    },
    content: {
      position: 'relative',
      isolation: 'isolate',
      display: 'flex',
      gap: '.5rem',
      flexDirection: 'column',
      padding: '1rem 1.5rem',
      paddingTop: '4.5rem',
      touchAction: 'none',
    },
  },
  variants: {
    anchor: {
      'bottom-full': {
        container: {
          '& [data-notification-blur-mobile]': { display: 'block' },
          '--notification-glow-flip': 'scaleX(-1)',
        },
        glow: {
          width: '175vw',
          bottom: -72,
          left: -16,
          right: 'auto',
        },
        content: {
          marginLeft: 0,
          alignItems: 'flex-start',
          textAlign: 'left',
          paddingBottom: 'max(1.5rem, calc(0.5rem + env(safe-area-inset-bottom)))',
        },
      },
      'bottom-right': {
        container: {
          '& [data-notification-blur-desktop]': { display: 'block' },
          '--notification-blur-feather': 'linear-gradient(to right, transparent, black 60%)',
          '--notification-glow-flip': 'none',
        },
        glow: {
          width: 'clamp(1000px, calc(100vw + 32px), 1500px)',
          bottom: -64,
          left: 'auto',
          right: -16,
        },
        content: {
          marginLeft: 'auto',
          alignItems: 'flex-end',
          textAlign: 'right',
          paddingBottom: '1.5rem',
        },
      },
    },
    glow: {
      rainbow: {
        glow: {
          backgroundImage: 'url(/img/tip/tip-glow-alpha.webp)',
          transform: 'var(--notification-glow-flip)',
        },
      },
    },
  },
  // The anchor is selected through props, so Panda must emit the lg class ahead of time.
  staticCss: ['*', { anchor: ['bottom-right'], conditions: ['lg'] }],
})

export default notificationRecipe
