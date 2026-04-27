import { defineSlotRecipe } from '@pandacss/dev'

/**
 * Slot recipe for the liminal-glass Dialog. Owns every style for the dialog tree
 * (Dialog.tsx, DialogTitle.tsx, DialogContent.tsx) so coupled values — radii, paddings,
 * the scroll-fade mask — sit next to each other rather than being kept in sync across
 * files.
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
    'titleContainer',
    'titleText',
    'headerSide',
    'headerButton',
    'headerSearchRow',
    'sectionHeader',
    'sectionHeaderText',
    'sectionHeaderLineLeft',
    'sectionHeaderLineRight',
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
      // Self-hosted in /public/fonts/radio-canada-big.css; loaded from index.html. Scoped to the dialog tree (not global) — fallback chain matches the rest of the app.
      fontFamily: "'Radio Canada Big', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
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
    /** Wrapper around the dialog children (title + body) — establishes its own stacking context so content paints above the decorative layers. */
    contentLayer: {
      position: 'relative',
    },
    /** Positioning context for the scrollable `content` and its custom scrollbar thumb overlay. The thumb is an absolutely-positioned sibling of `content` (not a child) so it does not scroll with the content. */
    contentWrapper: {
      position: 'relative',
    },
    /** Scrollable content region — owns the scroll behavior and the responsive font size. `dvh` (rather than `vh`) on the max-height matches the `glassSheet` parent's unit so the two heights track the same viewport when the iOS address bar shows/hides; otherwise `70vh` can resolve larger than `glassSheet`'s `80dvh` budget allows, and the bottom of `content` (where the mask fade lives) gets clipped off by `glassSheet`'s `overflow: hidden`. */
    content: {
      fontSize: '1.125rem',
      color: 'fg',
      maxHeight: '70dvh',
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
      // 1rem matches the rest of the dialog inset (titleContainer, headerSearchRow); the parent `content` slot also has 0.5rem paddingRight reserved for the scrollbar gutter.
      paddingLeft: '1rem',
      paddingRight: '0.5rem',
      // Add bottom padding to the inner content wrapper, so the mask doesn't fade out the last bit of content.
      paddingBottom: '2rem',
    },
    /**
     * Header row — flex row laying out: left button cluster, centered title, right button
     * cluster. The flex:1 cluster wrappers balance the row so the title stays centered.
     */
    titleContainer: {
      display: 'flex',
      alignItems: 'center',
      // 1rem inset on the sides and the top edge of the dialog; the bottom is tighter
      // so the search row that follows sits closer to the header.
      paddingInline: '1rem',
      paddingTop: '1rem',
      paddingBottom: '0.5rem',
    },
    /**
     * Left/right cluster wrapper — flex row that holds the circular header buttons.
     * `flex: 1` lets each cluster claim half the row so the centered title sits in the
     * middle. `&:last-child` aligns the right cluster's buttons to the trailing edge.
     */
    headerSide: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.25rem',
      flex: 1,
      '&:last-child': {
        justifyContent: 'flex-end',
      },
    },
    /**
     * Reusable circular modal button — used four times in the dialog header
     * (Back, Forward, Help, Close). The icon is supplied by the consumer.
     */
    headerButton: {
      width: '36px',
      height: '36px',
      minWidth: '36px',
      minHeight: '36px',
      borderRadius: '50%',
      backgroundColor: 'dialogHeaderButtonBg',
      border: '1px solid {colors.dialogHeaderButtonBorder}',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      padding: 0,
      color: 'fg',
      transition: 'background-color {durations.fast} ease-in-out',
      _hover: {
        backgroundColor: 'dialogHeaderButtonBgHover',
      },
    },
    /** The title heading itself — slightly smaller than the original dialog title, centered between the button clusters. */
    titleText: {
      fontWeight: '600',
      color: 'fg',
      borderBottom: 'none',
      fontSize: '1.25rem',
      margin: 0,
      textAlign: 'center',
      whiteSpace: 'nowrap',
    },
    /**
     * Search row that lives between the header and the scrollable content. Sits outside
     * the scroll container so the command list scrolls underneath the dialog header,
     * and the search input itself stays put with no need for sticky positioning.
     * Left padding matches contentInner so the search glyph aligns with the section
     * headers and command list down the left edge of the panel.
     */
    headerSearchRow: {
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '0.5rem',
      paddingInline: '1rem',
      paddingBlock: '0.5rem',
    },
    /**
     * Section header row inside the command list — centered title flanked by gradient lines
     * that fade outward into the panel. Used to delimit each command group ("Creating
     * Thoughts", "Navigation", etc.) within the scrollable content.
     */
    sectionHeader: {
      display: 'flex',
      alignItems: 'center',
      // 1rem horizontal gap leaves a comfortable margin between the title text and
      // the gradient hairlines that fade outward on either side.
      gap: '1rem',
      paddingBlock: '0.5rem 0.75rem',
    },
    /** Centered text of a section header — sits between the two gradient lines. */
    sectionHeaderText: {
      fontSize: '1.125rem',
      fontWeight: 500,
      color: 'fg',
      borderBottom: 'none',
      margin: 0,
      whiteSpace: 'nowrap',
    },
    /**
     * Left gradient hairline of the section header — fades from transparent (far left edge
     * of the panel) to solid near the section title.
     */
    sectionHeaderLineLeft: {
      flexGrow: 1,
      height: '1px',
      background: 'linear-gradient(to right, {colors.transparent} 0%, {colors.dialogHeaderDivider} 100%)',
    },
    /** Mirror on the right side: solid near the title, fading to transparent toward the panel edge. */
    sectionHeaderLineRight: {
      flexGrow: 1,
      height: '1px',
      background: 'linear-gradient(to right, {colors.dialogHeaderDivider} 0%, {colors.transparent} 100%)',
    },
  },
})

export default dialogRecipe
