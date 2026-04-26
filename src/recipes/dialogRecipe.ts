import { defineSlotRecipe } from '@pandacss/dev'

/**
 * Slot recipe for the liminal-glass Dialog. Owns every style for the dialog tree
 * (Dialog.tsx, DialogTitle.tsx, DialogContent.tsx) so coupled values — radii,
 * paddings, the scrollGradient/contentBottomSpacer height pair — sit next to
 * each other rather than being kept in sync across files.
 */
const dialogRecipe = defineSlotRecipe({
  className: 'dialog',
  slots: [
    'overlay',
    'backgroundGlow',
    'wrapper',
    'highlightUnclipped',
    'highlightClipped',
    'rainbowUnclipped',
    'rainbowClipped',
    'glassSheet',
    'containerBackground',
    'glassClipWrapper',
    'glassStrokeMask',
    'glassStrokeBorder',
    'contentLayer',
    'scrollGradient',
    'content',
    'contentInner',
    'contentBottomSpacer',
    'titleContainer',
    'titleText',
  ],
  base: {
    /** Full-viewport backdrop — transparent fill plus the backdrop blur that softens whatever's behind the dialog. */
    overlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'transparent',
      backdropFilter: 'blur(10px)',
      zIndex: 'dialogContainer',
      overflow: 'hidden',
      touchAction: 'none',
    },
    /** Soft full-screen color glow rendered behind the glass sheet to add subtle ambient color to the backdrop. */
    backgroundGlow: {
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      backgroundImage: 'url(/img/dialog/dialog-background-glow.avif)',
      backgroundSize: '250vw 200vh',
      backgroundPosition: 'center bottom',
      backgroundRepeat: 'no-repeat',
      opacity: 0.3,
      pointerEvents: 'none',
    },
    /** Wrapper around the glass sheet that lets unclipped highlight/rainbow layers bleed past the glass edges. */
    wrapper: {
      position: 'relative',
      maxWidth: '500px',
      width: '87.5%',
    },
    /** Light highlight image pinned to the top of the viewport — bleeds past the top edge of the glass to suggest light spilling onto the surrounding screen. */
    highlightUnclipped: {
      position: 'fixed',
      top: -72,
      left: 0,
      width: '100vw',
      height: '40vh',
      backgroundImage: 'url(/img/dialog/dialog-highlight.avif)',
      backgroundSize: '100% 100%',
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'top center',
      opacity: 0.1,
      pointerEvents: 'none',
    },
    /** Same highlight image clipped to the glass — paired with highlightUnclipped to suggest light "trapped" inside the glass. */
    highlightClipped: {
      position: 'absolute',
      top: 'calc(-50vh + 50%)',
      left: '50%',
      transform: 'translateX(-50%)',
      width: '100vw',
      height: '40%',
      backgroundImage: 'url(/img/dialog/dialog-highlight.avif)',
      backgroundSize: '100% 100%',
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'top center',
      opacity: 0.2,
      pointerEvents: 'none',
    },
    /** Rainbow refraction image that bleeds past the top edge of the glass. */
    rainbowUnclipped: {
      position: 'absolute',
      top: 'calc(-50vh + 50%)',
      left: '50%',
      transform: 'translateX(-50%)',
      width: '200vw',
      height: '40%',
      backgroundImage: 'url(/img/dialog/dialog-highlight-rainbow.avif)',
      backgroundSize: 'cover',
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'bottom center',
      opacity: 0.05,
      mixBlendMode: 'screen',
      pointerEvents: 'none',
    },
    /** Same rainbow refraction clipped to the glass — paired with rainbowUnclipped to suggest refractions trapped inside the glass. */
    rainbowClipped: {
      position: 'absolute',
      top: 'calc(-50vh + 50%)',
      left: '50%',
      transform: 'translateX(-50%)',
      width: '200vw',
      height: '40%',
      backgroundImage: 'url(/img/dialog/dialog-highlight-rainbow.avif)',
      backgroundSize: 'cover',
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'bottom center',
      opacity: 0.08,
      mixBlendMode: 'screen',
      pointerEvents: 'none',
    },
    /** The glass sheet itself — rounded translucent panel that hosts the dialog content and decorative layers. */
    glassSheet: {
      color: 'fg',
      paddingTop: '0.75rem',
      borderRadius: '32px',
      width: '100%',
      boxSizing: 'border-box',
      overflow: 'hidden',
      position: 'relative',
      maxHeight: '80dvh',
    },
    /** Muted-purple radial fill concentrated near the top of the glass and fading toward the bottom. */
    containerBackground: {
      position: 'absolute',
      inset: 0,
      borderRadius: '32px',
      pointerEvents: 'none',
      background:
        'radial-gradient(140% 89% at 50% 29%, {colors.dialogGlassFillTop} 0%, {colors.dialogGlassFillMid} 52%, {colors.transparent} 87%)',
    },
    /** Rounded clip region containing the highlight/rainbow layers "trapped" inside the glass. */
    glassClipWrapper: {
      position: 'absolute',
      inset: 0,
      pointerEvents: 'none',
      clipPath: 'inset(0 round 32px)',
    },
    /** Luminance mask that fades the glass stroke off toward the bottom — simulates light falling off across the glass surface. */
    glassStrokeMask: {
      position: 'absolute',
      inset: 0,
      borderRadius: '32px',
      pointerEvents: 'none',
      maskImage:
        'radial-gradient(94.3% 90.61% at 46.96% 13.01%, {colors.white} 0%, {colors.dialogGlassMaskFade} 94.3%)',
      WebkitMaskImage:
        'radial-gradient(94.3% 90.61% at 46.96% 13.01%, {colors.white} 0%, {colors.dialogGlassMaskFade} 94.3%)',
    },
    /** Gradient border on the glass sheet that approximates light refracting through the glass edge. CSS can't paint a linear gradient as a real border, so this paints a 1px transparent border with a gradient background and uses a padding-box/border-box mask to keep only the border slice visible. */
    glassStrokeBorder: {
      position: 'absolute',
      inset: 0,
      borderRadius: '32px',
      borderStyle: 'solid',
      borderColor: 'transparent',
      borderWidth: '1px',
      background:
        'linear-gradient(180deg, {colors.dialogGlassStrokeMuted} 0%, {colors.dialogGlassStrokeMuted} 76%, {colors.dialogGlassStrokeBright} 100%) border-box',
      WebkitMask: 'linear-gradient(white 0 0) padding-box, linear-gradient(white 0 0)',
      WebkitMaskComposite: 'xor',
      mask: 'linear-gradient(white 0 0) padding-box, linear-gradient(white 0 0)',
      maskComposite: 'exclude',
    },
    /** Wrapper around the dialog children (title + body) — establishes its own stacking context so content paints above the decorative layers. */
    contentLayer: {
      position: 'relative',
    },
    /** Bottom-anchored fade — visual cue that the dialog content is scrollable. */
    scrollGradient: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      left: 0,
      // Clears the scrollbar gutter so the gradient ends flush with the content area, not under the scrollbar.
      marginRight: 20,
      pointerEvents: 'none',
      display: 'block',
      // Must be twice contentBottomSpacer.height — the spacer keeps the last content line above where the gradient becomes opaque.
      height: 48,
      background: 'linear-gradient(to top, {colors.dialogScrollShadow} 0%, {colors.transparent} 100%)',
    },
    /** Scrollable content region — owns the scroll behavior, scrollbar styling, and the responsive font size. */
    content: {
      fontSize: '1.125rem',
      color: 'fg',
      maxHeight: '70vh',
      overflowX: 'hidden',
      overflowY: 'auto',
      // Horizontal text padding lives on contentInner; this paddingRight gives the scrollbar breathing room from the modal edge.
      paddingBlock: '0.5rem',
      paddingRight: '0.5rem',
      scrollbarColor: '{colors.fg} {colors.bg}',
      scrollbarWidth: 'thin',
      '&::-webkit-scrollbar': {
        width: '8px',
      },
      '&::-webkit-scrollbar-track': {
        background: 'transparent',
      },
      position: 'relative',
      '@media (min-width: 1200px)': {
        fontSize: '1.5rem',
      },
      overscrollBehavior: 'contain',
    },
    /** Inner wrapper inside `content` that carries the horizontal text inset. Kept separate from `content` so the scrollbar gutter doesn't push text in further. */
    contentInner: {
      // Left matches titleContainer.paddingInline so title and content text share a consistent inset; right is reduced because the scrollbar gutter consumes the rest.
      paddingLeft: '1.25rem',
      paddingRight: '0.75rem',
    },
    /** Empty buffer at the end of the scrollable content — keeps the last line of text above where the scroll-edge gradient becomes opaque. */
    contentBottomSpacer: {
      // Half of scrollGradient.height — keeps the last content line above where the scroll-edge gradient becomes opaque.
      height: 24,
    },
    /** Header row — flex row that lays out the title text and the close button. */
    titleContainer: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      // Matches contentInner.paddingLeft so the title shares a consistent inset with the content text.
      paddingInline: '1.25rem',
    },
    /** The title heading itself — bold, with a responsive size bump on larger screens. */
    titleText: {
      fontWeight: '700',
      color: 'fg',
      borderBottom: 'none',
      fontSize: '1.25rem',
      margin: '0.625rem 0',
      '@media (min-width: 1200px)': {
        fontSize: '1.75rem',
      },
    },
  },
})

export default dialogRecipe
