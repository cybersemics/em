import { defineSlotRecipe } from '@pandacss/dev'

/**
 * Slot recipe for the liminal-glass Dialog shell. Owns the glass sheet, its decorative
 * highlight/rainbow/stroke layers, and the scrollable content region (Dialog.tsx,
 * DialogContent.tsx) so coupled values — radii, paddings, the scroll-fade mask — sit next
 * to each other rather than being kept in sync across files. The header row and its buttons
 * (DialogHeader.tsx, CircleButton.tsx) style themselves inline with `css()`.
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
    'contentWrapper',
    'content',
    'contentInner',
    'scrollbarThumb',
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
      backdropFilter: 'blur(10px) brightness(0.75) saturate(0.60) contrast(1.0)',
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
    /** The glass sheet itself — rounded translucent panel that hosts the dialog content and decorative layers. Lays out its in-flow content as a flex column so the scrollable region (`content`) can shrink to fill whatever space the header and search row leave, rather than overflowing this 80dvh budget and being clipped by `overflow: hidden`. Decorative layers are absolutely positioned and so sit outside this flex flow. */
    glassSheet: {
      color: 'fg',
      borderRadius: '32px',
      width: '100%',
      boxSizing: 'border-box',
      overflow: 'hidden',
      position: 'relative',
      maxHeight: '80dvh',
      display: 'flex',
      flexDirection: 'column',
    },
    /** Muted-purple radial fill concentrated near the top of the glass and fading toward the bottom. */
    containerBackground: {
      position: 'absolute',
      inset: 0,
      borderRadius: '32px',
      pointerEvents: 'none',
      background:
        'radial-gradient(140% 89% at 50% 29%, {colors.dialogGlassFillTop} 0%, {colors.dialogGlassFillMid} 52%, {colors.dialogGlassFillBottom} 87%)',
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
    /** Wrapper around the dialog children (title + body) — establishes its own stacking context so content paints above the decorative layers. Flex column with `minHeight: 0` so it can shrink within `glassSheet`'s 80dvh cap and hand the leftover space to `contentWrapper`/`content`. */
    contentLayer: {
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
      minHeight: 0,
    },
    /** Positioning context for the scrollable `content` and its custom scrollbar thumb overlay. The thumb is an absolutely-positioned sibling of `content` (not a child) so it does not scroll with the content. Takes the remaining column space after the header and search row (`flex: 1` + `minHeight: 0`) so `content` can fill it and scroll internally. */
    contentWrapper: {
      position: 'relative',
      flex: 1,
      minHeight: 0,
      display: 'flex',
      flexDirection: 'column',
    },
    /** Scrollable content region — owns the scroll behavior and the responsive font size. Fills the column space `contentWrapper` hands down (`flex: 1` + `minHeight: 0`) instead of carrying its own viewport-relative max-height. This way the header and search row claim their natural height first and `content` takes whatever is left of `glassSheet`'s 80dvh budget — so the three never sum past 80dvh and the bottom of the scroll region (where the mask fade lives) is never clipped off by `glassSheet`'s `overflow: hidden`. */
    content: {
      fontSize: '1.125rem',
      color: 'fg',
      flex: 1,
      minHeight: 0,
      overflowX: 'hidden',
      overflowY: 'auto',
      // Horizontal text padding lives on contentInner; this paddingRight gives the scrollbar breathing room from the modal edge.
      paddingTop: '0.5rem',
      paddingRight: '0.5rem',
      // The native scrollbar is hidden and replaced by the custom `scrollbarThumb` overlay (rendered in
      // DialogContent). iOS WebKit cannot recolor its native overflow scrollbar via CSS — `scrollbarColor`,
      // the `::-webkit-scrollbar-*` pseudo-elements, and `color-scheme` are all ignored for the inner
      // overlay scrollbar — so on iOS < 26 it always painted dark. A JS-driven thumb is the only way to get
      // a consistent scrollbar across iOS 18, iOS 26, and Android.
      scrollbarWidth: 'none',
      '&::-webkit-scrollbar': {
        display: 'none',
      },
      position: 'relative',
      '@media (min-width: 1200px)': {
        fontSize: '1.5rem',
      },
      overscrollBehavior: 'contain',
      // Static bottom-edge fade as a scrollability cue. The plateau ends 3.75rem above the
      // bottom edge and the mask completes its fade 0.25rem before the very bottom — leaving
      // a 0.25rem fully-transparent strip at the very bottom for a clean edge.
      maskImage:
        'linear-gradient(to bottom, {colors.black} 0, {colors.black} calc(100% - 3.75rem), {colors.transparent} calc(100% - 0.25rem))',
      WebkitMaskImage:
        'linear-gradient(to bottom, {colors.black} 0, {colors.black} calc(100% - 3.75rem), {colors.transparent} calc(100% - 0.25rem))',
      // Scroll-driven mask animations. Two effects share this element:
      //   1. Top-edge fade ramps up as the user scrolls down (off at scroll = 0).
      //   2. Bottom-edge fade collapses into the tail as the user reaches the bottom,
      //      so the scrollability cue disappears once there's nothing left to scroll to.
      // Relies on `animation-timeline`, which has been supported in Chrome since 2023
      // and Safari since 2025.
      '@supports (animation-timeline: scroll(self))': {
        maskImage:
          'linear-gradient(to bottom, {colors.transparent} 0, {colors.black} var(--dialog-content-mask-fade-top), {colors.black} calc(100% - var(--dialog-content-mask-fade-bottom)), {colors.transparent} calc(100% - 0.25rem))',
        WebkitMaskImage:
          'linear-gradient(to bottom, {colors.transparent} 0, {colors.black} var(--dialog-content-mask-fade-top), {colors.black} calc(100% - var(--dialog-content-mask-fade-bottom)), {colors.transparent} calc(100% - 0.25rem))',
        animationName: 'dialogContentScrollFade, dialogContentScrollFadeBottom',
        animationDuration: '1s, 1s',
        animationTimingFunction: 'linear, linear',
        animationFillMode: 'both, both',
        animationTimeline: 'scroll(self), scroll(self)',
        // Top fade ramps over the first 4rem of scroll; bottom fade collapses over the last 1rem.
        animationRange: '0 4rem, calc(100% - 1rem) 100%',
      },
    },
    /** Custom scrollbar thumb overlaying the right edge of `content`. Its height, vertical position, and visibility are driven by JS in DialogContent (the native scrollbar is hidden on `content`). Uses the same translucent grey (`fgOverlay20`) as the app's default scrollbars (e.g. Sidebar), and is consistent on every platform, unlike iOS's uncontrollable native overlay scrollbar. */
    scrollbarThumb: {
      position: 'absolute',
      top: 0,
      right: '2px',
      width: '4px',
      borderRadius: '2px',
      background: 'fgOverlay20',
      opacity: 0,
      transition: 'opacity 0.3s ease',
      pointerEvents: 'none',
      // Sits above the content and its decorative mask.
      zIndex: 1,
    },
    /** Inner wrapper inside `content` that carries the horizontal text inset. Kept separate from `content` so the scrollbar gutter doesn't push text in further. */
    contentInner: {
      // 1rem matches the rest of the dialog inset (the header row in DialogHeader and the search row in MobileCommandUniverse).
      // 0.5rem right padding gives the scrollbar some breathing room from the panel's content and the edge of the panel.
      paddingLeft: '1rem',
      paddingRight: '0.5rem',
      // Add bottom padding to the inner content wrapper, so the mask doesn't fade out the last bit of content.
      paddingBottom: '2rem',
    },
  },
})

export default dialogRecipe
