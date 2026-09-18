import { defineSlotRecipe } from '@pandacss/dev'
import { NOTIFICATION_CORNER_MASK } from '../constants'

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
      // At the bottom-right anchor the blur and scrim are a corner rather than a full-width band: a box sized to the
      // content, feathered by one shared elliptical mask so the two layers fade out together to the left and upward.
      '& [data-notification-blur-desktop]': {
        left: 'auto',
        top: 'auto',
        width: 'min(80vw, 40rem)',
        height: '100%',
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
          // Scope anchor geometry to the rainbow glow so it cannot override the pinned-command variant.
          '& [data-notification-glow="rainbow"]': {
            transform: 'scaleX(-1)',
            width: '175vw',
            bottom: '-72px',
            left: '-16px',
            right: 'auto',
          },
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
          // The anchor is responsive, so the base bottom-full class is still applied here; hide its full-width blur
          // explicitly or both blur boxes render and the corner treatment is buried under a full-width one.
          '& [data-notification-blur-mobile]': { display: 'none' },
          '& [data-notification-blur-desktop]': { display: 'block' },
          '& [data-notification-gradient]': {
            left: 'auto',
            top: 'auto',
            width: 'min(80vw, 40rem)',
            height: '100%',
            maskImage: NOTIFICATION_CORNER_MASK,
            WebkitMaskImage: NOTIFICATION_CORNER_MASK,
          },
          '& [data-notification-glow="rainbow"]': {
            transform: 'none',
            width: 'clamp(1000px, calc(100vw + 32px), 1500px)',
            bottom: '-64px',
            left: 'auto',
            right: '-16px',
          },
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
      rainbow: {},
      // The pinned command's glow does not follow the content height. Its consumer switches anchor at lg, so the
      // per-anchor values are keyed by that breakpoint here; Panda rejects compound variants once a variant value is
      // responsive.
      //
      // The glow element is the image's own footprint, so the image's constants live in the aspect ratio and every
      // other value is a fraction of one viewport dimension. Portrait scales with viewport width and anchors left,
      // matched to the design at 412×922; landscape scales with viewport height and anchors right, matched at 922×412.
      // Sizing from a single dimension avoids iOS Safari's unstable vh in portrait, and the bottom anchor adds the
      // safe-area inset so the bright band follows the text above the home indicator. Tablet and desktop share the lg
      // branch, where the glow must stay localized in the corner at the phone size, so each height-relative value is
      // capped at approximately its 412px-tall value so the proportions hold.
      // The glow image is deliberately oversized and positioned mostly offscreen to frame its bright band:
      // 329.7vw is about 1358px at the 412px portrait reference width; 242.7vh is about 1000px at the 412px
      // landscape reference height. The matching -46.9vh bottom offset is about -193px at that height.
      // These are image-placement ratios from visual tuning, not dimensions of the tooltip content.
      pinnedCommand: {
        glow: {
          width: {
            base: '329.7vw',
            lg: 'min(242.7vh, 1000px)',
          },
          height: 'auto',
          aspectRatio: '3166 / 1617',
          bottom: {
            base: 'calc(-53.5vw + env(safe-area-inset-bottom))',
            lg: 'calc(max(-46.9vh, -193.2px) + env(safe-area-inset-bottom))',
          },
          left: { base: '-69.7vw', lg: 'auto' },
          right: { base: 'auto', lg: 'max(-113.5vh, -467.6px)' },
          opacity: '1',
          filter: {
            base: 'blur(0px)',
            lg: 'blur(16px)',
          },
          backgroundSize: '100% 100%',
          backgroundPosition: '0 0',
          transform: 'none',
        },
      },
    },
  },
  // The anchor is selected through props, so Panda must emit the lg class ahead of time.
  staticCss: ['*', { anchor: ['bottom-right'], conditions: ['lg'] }],
})

export default notificationRecipe
