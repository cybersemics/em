import { defineSlotRecipe } from '@pandacss/dev'

/** Shared, explicitly authored falloff for the glass fill and stroke. */
const desktopLightMaskOnGlass =
  'radial-gradient(125.07% 141.6% at calc(50% + 5.5px) -19px, rgba(0, 0, 0, 1.000) 0%, rgba(0, 0, 0, 0.793) 10%, rgba(0, 0, 0, 0.612) 20%, rgba(0, 0, 0, 0.456) 30%, rgba(0, 0, 0, 0.325) 40%, rgba(0, 0, 0, 0.218) 50%, rgba(0, 0, 0, 0.133) 60%, rgba(0, 0, 0, 0.071) 70%, rgba(0, 0, 0, 0.029) 80%, rgba(0, 0, 0, 0.006) 90%, rgba(0, 0, 0, 0.000) 100%)'

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
    'progressiveBlurLayer',
    'glassBackdropBlur',
    'appScrim',
    'backgroundGlow',
    'wrapper',
    'highlightUnclipped',
    'roomLight',
    'shellHalo',
    'highlightClipped',
    'rainbowUnclipped',
    'rainbowClipped',
    'glassSheet',
    'containerBackground',
    'glassClipWrapper',
    'glassStrokeMask',
    'glassStrokeBorder',
    'contentLayer',
    'topLight',
    'topStreak',
    'contentWrapper',
    'content',
    'contentInner',
    'scrollbarThumb',
  ],
  base: {
    /** Full-viewport backdrop. Mobile keeps its existing filter; desktop uses ProgressiveBlur. */
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
      // Past md the panel sits near the top of the screen, as in Figma (glass top 83px down its 768px frame), so it
      // stays in the upper part of the room light, whose source sits above the glass.
      md: { backdropFilter: 'none', alignItems: 'flex-start', paddingTop: '10.8vh' },
      zIndex: 'dialogContainer',
      overflow: 'hidden',
      touchAction: 'none',
    },
    /**
     * Desktop progressive blur of the app. A sibling painted just below the overlay (same layer, earlier in the DOM),
     * not a child of it; see Dialog. It covers the top 85% of the screen, fading to no blur at its bottom edge, rather
     * than all of it: each blur layer costs the GPU in proportion to its area, most of all in the frame the dialog opens.
     */
    progressiveBlurLayer: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      height: '85vh',
      zIndex: 'dialogContainer',
      pointerEvents: 'none',
      display: 'none',
      md: { display: 'block' },
    },
    /**
     * Desktop blur of whatever is directly behind the glass, so the app never reads through the commands. It fills the same containing block as the glass, so CSS maintains its bounds.
     */
    glassBackdropBlur: {
      position: 'absolute',
      inset: 0,
      borderRadius: '32px',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      pointerEvents: 'none',
      display: 'none',
      md: { display: 'block' },
    },
    /**
     * Desktop: full-viewport scrim dimming the app behind the modal slightly and evenly, so the panel and its light
     * stand out while the app stays readable around it. Painted first in the overlay, so the light layers sit on top.
     */
    appScrim: {
      position: 'fixed',
      inset: 0,
      pointerEvents: 'none',
      background: 'rgba(0, 0, 0, 0.15)',
      display: 'none',
      md: { display: 'block' },
    },
    /** Soft full-screen color glow rendered behind the glass sheet to add subtle ambient color to the backdrop. Mobile-only. */
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
      // Past md, the light comes from the desktop lighting layers (see the note at the top of this file) instead.
      md: { display: 'none' },
    },
    /** Wrapper around the glass sheet that lets unclipped highlight/rainbow layers bleed past the glass edges. */
    wrapper: {
      position: 'relative',
      maxWidth: '500px',
      width: '87.5%',
      // Past md the dialog grows to fill ~80% of the viewport, capped so it
      // never gets unwieldy on large desktops.
      md: {
        width: '80%',
        maxWidth: '650px',
        // Lets the browser scale the panel and its large light layers as already-rendered layers during the open and
        // close animation, instead of re-rendering them at every intermediate scale.
        willChange: 'transform',
      },
      // Past the 2xl ("approx size of a desktop") breakpoint, raise the cap to
      // match DesktopCommandUniverse's 826px width — keeps the two dialogs
      // visually consistent on desktop.
      '2xl': {
        maxWidth: '826px',
      },
    },
    /** Light highlight image pinned to the top of the viewport — bleeds past the top edge of the glass to suggest light spilling onto the surrounding screen. Mobile-only: past md the modal sits in too much surrounding space for the bleed-out effect to read. */
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
      md: { display: 'none' },
    },
    /**
     * Desktop room light (Figma "Background glow"): a soft violet-to-peach light from the top of the screen, behind the
     * panel, drawn as the CSS gradients in roomLightGradients rather than an image, so Chrome dithers it and it does
     * not band. They were fitted to Figma's light with its vignette and circular falloff applied, with the light's
     * colour converted to transparency so normal blending matches Figma's Screen blend over the dark backdrop. The box
     * covers only where the light is visible. Sized from the panel's width; see the desktop lighting note at the top
     * of this file.
     */
    roomLight: {
      display: 'none',
      md: {
        display: 'block',
        position: 'absolute',
        left: 'calc(50% - 107.52cqw)',
        top: '-149.71cqw',
        width: '218.58cqw',
        height: '316.22cqw',
        backgroundImage: `radial-gradient(60.64% 73.03% at 62.27% 48.5%, rgba(222, 244, 255, 0.0158) 0%, rgba(222, 244, 255, 0.0151) 10%, rgba(222, 244, 255, 0.0132) 20%, rgba(222, 244, 255, 0.0105) 30%, rgba(222, 244, 255, 0.0077) 40%, rgba(222, 244, 255, 0.0051) 50%, rgba(222, 244, 255, 0.0031) 60%, rgba(222, 244, 255, 0.0017) 70%, rgba(222, 244, 255, 0.0009) 80%, rgba(222, 244, 255, 0.0004) 90%, rgba(222, 244, 255, 0.0000) 100%),
radial-gradient(47.32% 32.33% at 53.21% 40.43%, rgba(28, 0, 255, 0.0564) 0%, rgba(28, 0, 255, 0.0539) 10%, rgba(28, 0, 255, 0.0471) 20%, rgba(28, 0, 255, 0.0376) 30%, rgba(28, 0, 255, 0.0275) 40%, rgba(28, 0, 255, 0.0183) 50%, rgba(28, 0, 255, 0.0112) 60%, rgba(28, 0, 255, 0.0062) 70%, rgba(28, 0, 255, 0.0032) 80%, rgba(28, 0, 255, 0.0015) 90%, rgba(28, 0, 255, 0.0000) 100%),
radial-gradient(30.93% 24.29% at 52.5% 50.77%, rgba(186, 198, 255, 0.0893) 0%, rgba(186, 198, 255, 0.0854) 10%, rgba(186, 198, 255, 0.0746) 20%, rgba(186, 198, 255, 0.0596) 30%, rgba(186, 198, 255, 0.0435) 40%, rgba(186, 198, 255, 0.0290) 50%, rgba(186, 198, 255, 0.0177) 60%, rgba(186, 198, 255, 0.0098) 70%, rgba(186, 198, 255, 0.0050) 80%, rgba(186, 198, 255, 0.0023) 90%, rgba(186, 198, 255, 0.0000) 100%),
radial-gradient(54.87% 39.11% at 46.69% 51.07%, rgba(255, 211, 255, 0.1155) 0%, rgba(255, 211, 255, 0.1104) 10%, rgba(255, 211, 255, 0.0965) 20%, rgba(255, 211, 255, 0.0770) 30%, rgba(255, 211, 255, 0.0562) 40%, rgba(255, 211, 255, 0.0375) 50%, rgba(255, 211, 255, 0.0229) 60%, rgba(255, 211, 255, 0.0127) 70%, rgba(255, 211, 255, 0.0065) 80%, rgba(255, 211, 255, 0.0030) 90%, rgba(255, 211, 255, 0.0000) 100%),
radial-gradient(56.44% 37.35% at 40.5% 67.11%, rgba(255, 255, 120, 0.0171) 0%, rgba(255, 255, 120, 0.0163) 10%, rgba(255, 255, 120, 0.0143) 20%, rgba(255, 255, 120, 0.0114) 30%, rgba(255, 255, 120, 0.0083) 40%, rgba(255, 255, 120, 0.0056) 50%, rgba(255, 255, 120, 0.0034) 60%, rgba(255, 255, 120, 0.0019) 70%, rgba(255, 255, 120, 0.0010) 80%, rgba(255, 255, 120, 0.0004) 90%, rgba(255, 255, 120, 0.0000) 100%)`,
        pointerEvents: 'none',
      },
    },
    /**
     * Desktop light behind the glass (Figma "Modal Shell"): a blurred pink streak along the glass's top edge, which the
     * glass fill tints as it passes through. Its blur and the shared falloff are baked into the image (the falloff at
     * Figma's glass size), so the browser composites a plain image rather than a live blur filter under a large mask.
     */
    shellHalo: {
      display: 'none',
      md: {
        display: 'block',
        position: 'absolute',
        left: 'calc(50% - 380px)',
        top: '-51px',
        width: '966px',
        height: '190px',
        backgroundImage: 'url(/img/dialog/dialog-shell-streak.avif)',
        backgroundSize: '100% 100%',
        // Applied here, not baked into the image, so the image keeps its full range of transparency levels.
        opacity: 0.177,
        pointerEvents: 'none',
      },
    },
    /** Same highlight image clipped to the glass — paired with highlightUnclipped to suggest light "trapped" inside the glass. Mobile-only (paired with highlightUnclipped). */
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
      md: { display: 'none' },
    },
    /** Rainbow refraction image that bleeds past the top edge of the glass. Mobile-only (paired with rainbowClipped). */
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
      md: { display: 'none' },
    },
    /** Same rainbow refraction clipped to the glass — paired with rainbowUnclipped to suggest refractions trapped inside the glass. Mobile-only (paired with rainbowUnclipped). */
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
      md: { display: 'none' },
    },
    /** The glass sheet itself — rounded translucent panel that hosts the dialog content and decorative layers. Lays out its in-flow content as a flex column so the scrollable region (`content`) can shrink to fill whatever space the header and search row leave, rather than overflowing this 80dvh budget and being clipped by `overflow: hidden`. Decorative layers are absolutely positioned and so sit outside this flex flow. */
    glassSheet: {
      color: 'fg',
      fontFamily: 'radioCanada',
      borderRadius: '32px',
      width: '100%',
      boxSizing: 'border-box',
      overflow: 'hidden',
      position: 'relative',
      maxHeight: '80dvh',
      display: 'flex',
      flexDirection: 'column',
      md: { maxHeight: '560px' },
    },
    /**
     * Radial fill behind the dialog content. Mobile anchors a darker muted-blue wash near the top, paired with the
     * highlight/rainbow layers above it. Past md it is Figma's glass fill: an elliptical gradient tilted 32°, opaque
     * deep purple low in the panel (47.8%, 71.1%) thinning to translucent lavender at the edges, drawn by the ::before
     * because CSS cannot tilt a radial gradient. The shared falloff (desktopLightMaskOnGlass) fades it with the light,
     * so the top of the glass reads as lit lavender and the fill dissolves towards the bottom.
     */
    containerBackground: {
      position: 'absolute',
      inset: 0,
      borderRadius: '32px',
      pointerEvents: 'none',
      background:
        'radial-gradient(140% 89% at 50% 29%, {colors.dialogGlassFillTop} 0%, {colors.dialogGlassFillMid} 52%, {colors.dialogGlassFillBottom} 87%)',
      md: {
        background: 'none',
        overflow: 'hidden',
        maskImage: desktopLightMaskOnGlass,
        WebkitMaskImage: desktopLightMaskOnGlass,
        '&::before': {
          content: '""',
          position: 'absolute',
          left: '47.8%',
          top: '71.1%',
          // Just large enough to cover the largest glass (826 × 560) from the gradient's centre at any rotation: its
          // farthest corner is 587px away. A larger square only adds area for the browser to rasterise.
          width: '1200px',
          height: '1200px',
          transform: 'translate(-50%, -50%) rotate(32deg)',
          background: 'radial-gradient(594px 456px at 50% 50%, rgb(40, 21, 66) 0%, rgba(127, 123, 206, 0.32) 100%)',
        },
      },
    },
    /** Rounded clip region containing the highlight/rainbow layers "trapped" inside the glass. */
    glassClipWrapper: {
      position: 'absolute',
      inset: 0,
      pointerEvents: 'none',
      clipPath: 'inset(0 round 32px)',
    },
    /** Luminance mask that fades the glass stroke off toward the bottom — simulates light falling off across the glass surface. Past md it is the shared falloff, so the edge fades with the light. */
    glassStrokeMask: {
      position: 'absolute',
      inset: 0,
      borderRadius: '32px',
      pointerEvents: 'none',
      md: {
        maskImage: desktopLightMaskOnGlass,
        WebkitMaskImage: desktopLightMaskOnGlass,
      },
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
      // Past md, Figma's slate-blue to light-grey edge; glassStrokeMask fades it out below the light.
      md: {
        background: 'linear-gradient(180deg, rgb(127, 139, 175) 0%, rgb(240, 240, 240) 100%) border-box',
      },
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
    /**
     * Desktop light over the panel, contents included (Figma Group 1179): soft colour washes, violet from above and
     * a neutral warmth below, drawn as the CSS gradients in lightWashGradients (fitted to Figma's three wash ellipses
     * with their luminance falloff applied) so Chrome dithers them and they do not band. Being above the contents, it
     * tints the text near the light as the concept does. Sized from the panel's width; see the desktop lighting note at
     * the top of this file.
     */
    topLight: {
      display: 'none',
      md: {
        display: 'block',
        position: 'absolute',
        left: 'calc(50% - 94.99cqw)',
        top: '-74.93cqw',
        width: '199.41cqw',
        height: '145.13cqw',
        backgroundImage: `radial-gradient(49.9% 46.74% at 53.91% 34.81%, rgba(129, 119, 234, 0.2060) 0%, rgba(129, 119, 234, 0.1969) 10%, rgba(129, 119, 234, 0.1721) 20%, rgba(129, 119, 234, 0.1374) 30%, rgba(129, 119, 234, 0.1003) 40%, rgba(129, 119, 234, 0.0669) 50%, rgba(129, 119, 234, 0.0408) 60%, rgba(129, 119, 234, 0.0227) 70%, rgba(129, 119, 234, 0.0116) 80%, rgba(129, 119, 234, 0.0054) 90%, rgba(129, 119, 234, 0.0000) 100%),
radial-gradient(19.82% 20.37% at 49.78% 44.73%, rgba(106, 112, 110, 0.1790) 0%, rgba(106, 112, 110, 0.1711) 10%, rgba(106, 112, 110, 0.1495) 20%, rgba(106, 112, 110, 0.1194) 30%, rgba(106, 112, 110, 0.0871) 40%, rgba(106, 112, 110, 0.0581) 50%, rgba(106, 112, 110, 0.0354) 60%, rgba(106, 112, 110, 0.0197) 70%, rgba(106, 112, 110, 0.0100) 80%, rgba(106, 112, 110, 0.0047) 90%, rgba(106, 112, 110, 0.0000) 100%),
radial-gradient(59.61% 52.6% at 53.61% 56.05%, rgba(122, 127, 119, 0.2050) 0%, rgba(122, 127, 119, 0.1960) 10%, rgba(122, 127, 119, 0.1712) 20%, rgba(122, 127, 119, 0.1367) 30%, rgba(122, 127, 119, 0.0998) 40%, rgba(122, 127, 119, 0.0666) 50%, rgba(122, 127, 119, 0.0406) 60%, rgba(122, 127, 119, 0.0226) 70%, rgba(122, 127, 119, 0.0115) 80%, rgba(122, 127, 119, 0.0054) 90%, rgba(122, 127, 119, 0.0000) 100%),
radial-gradient(47.39% 55.25% at 37.07% 40.94%, rgba(131, 118, 248, 0.0890) 0%, rgba(131, 118, 248, 0.0851) 10%, rgba(131, 118, 248, 0.0743) 20%, rgba(131, 118, 248, 0.0594) 30%, rgba(131, 118, 248, 0.0433) 40%, rgba(131, 118, 248, 0.0289) 50%, rgba(131, 118, 248, 0.0176) 60%, rgba(131, 118, 248, 0.0098) 70%, rgba(131, 118, 248, 0.0050) 80%, rgba(131, 118, 248, 0.0023) 90%, rgba(131, 118, 248, 0.0000) 100%)`,
        pointerEvents: 'none',
      },
    },
    /** Desktop: a faint blurred white streak just inside the glass's top edge, above the contents (Figma "Vector 419"). Its blur is baked into the image, so the browser composites a plain image rather than a live blur filter. */
    topStreak: {
      display: 'none',
      md: {
        display: 'block',
        position: 'absolute',
        left: 'calc(50% - 395px)',
        top: '-66px',
        width: '966px',
        height: '190px',
        backgroundImage: 'url(/img/dialog/dialog-top-streak.avif)',
        backgroundSize: '100% 100%',
        // Applied here, not baked into the image, so the image keeps its full range of transparency levels.
        opacity: 0.085,
        pointerEvents: 'none',
      },
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
