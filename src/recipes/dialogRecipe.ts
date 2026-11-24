import { defineSlotRecipe } from '@pandacss/dev'

/** Shared, explicitly authored falloff for the glass fill and stroke. */
const desktopLightMaskOnGlass =
  'radial-gradient(125.07% 141.6% at calc(50% + 5.5px) -19px, rgba(0, 0, 0, 1.000) 0%, rgba(0, 0, 0, 0.793) 10%, rgba(0, 0, 0, 0.612) 20%, rgba(0, 0, 0, 0.456) 30%, rgba(0, 0, 0, 0.325) 40%, rgba(0, 0, 0, 0.218) 50%, rgba(0, 0, 0, 0.133) 60%, rgba(0, 0, 0, 0.071) 70%, rgba(0, 0, 0, 0.029) 80%, rgba(0, 0, 0, 0.006) 90%, rgba(0, 0, 0, 0.000) 100%)'

/**
 * Slot recipe for the liminal-glass Dialog shell. Owns the overlay, the glass sheet, its decorative
 * highlight/rainbow/stroke layers, and the scrollable content region (Dialog.tsx, DialogGlass.tsx,
 * DialogContent.tsx) so coupled values — radii, paddings, the scroll-fade mask — sit next
 * to each other rather than being kept in sync across files. The header row and its buttons
 * (DialogHeader.tsx, CircleButton.tsx) style themselves inline with `css()`.
 */
const dialogRecipe = defineSlotRecipe({
  className: 'dialog',
  slots: [
    'overlay',
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
  ],
  base: {
    /** Full-viewport backdrop. Mobile keeps its existing filter; desktop dims the app with appScrim and blurs it only behind the glass (glassBackdropBlur). */
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
      // Past lg the panel sits near the top of the screen, so it stays in the upper part of the room light, whose
      // source sits above the glass.
      lg: { backdropFilter: 'none', alignItems: 'flex-start', paddingTop: '10.8vh' },
      zIndex: 'dialogContainer',
      overflow: 'hidden',
      touchAction: 'none',
    },
    /**
     * Desktop blur of whatever is directly behind the glass, so the app never reads through the commands. Rendered in the
     * overlay rather than inside the scaling wrapper, which would cut it off from the app; CommandUniverseGlassBackdrop
     * sizes and scales it to match the glass.
     */
    glassBackdropBlur: {
      position: 'absolute',
      borderRadius: '32px',
      // One layer only. A blur that varied down the glass took eight masked layers, and redrawing them as the glass
      // scaled and faded dropped patches of the screen for a frame at a time.
      backdropFilter:
        'blur(var(--cu-glass-blur, 6px)) saturate(var(--cu-glass-saturate, 1)) brightness(var(--cu-glass-brightness, 1)) contrast(var(--cu-glass-contrast, 1))',
      WebkitBackdropFilter:
        'blur(var(--cu-glass-blur, 6px)) saturate(var(--cu-glass-saturate, 1)) brightness(var(--cu-glass-brightness, 1)) contrast(var(--cu-glass-contrast, 1))',
      pointerEvents: 'none',
      display: 'none',
      lg: { display: 'block' },
    },
    /**
     * Desktop: full-viewport scrim dimming the app behind the modal slightly and evenly, so the panel and its light
     * stand out while the app stays readable around it. Painted first in the overlay, so the light layers sit on top.
     */
    appScrim: {
      position: 'fixed',
      inset: 0,
      pointerEvents: 'none',
      background:
        // Sized and placed in multiples of the glass's box (published by CommandUniverseGlassBackdrop), so it keeps its
        // shape around the glass at any window size. Sized from the glass rather than the window on purpose: on a large
        // window a window-sized scrim swallows the page, while the area around the glass should look the same. The centre is offset from the glass's centre in glass widths, and
        // measured down from the glass's top edge in glass heights. The colour stops run from the centre (0%) to the
        // radius (100%): clear at the glass's centre, darkest around its edge, easing off beyond it; past the last stop
        // its colour carries on to the edges of the screen.
        // TEMPORARY: --cu-scrim-* are dialed by CommandUniverseGlassDebugPanel.
        'radial-gradient(calc(var(--cu-glass-width, 650px) * var(--cu-scrim-rx, 1.55)) calc(var(--cu-glass-height, 540px) * var(--cu-scrim-ry, 1.71)) at calc(var(--cu-glass-centre-x, 50%) + var(--cu-glass-width, 650px) * var(--cu-scrim-cx, 0)) calc(var(--cu-glass-top, 10.8vh) + var(--cu-glass-height, 540px) * var(--cu-scrim-cy, 0.5)), var(--cu-scrim-stops, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0.9) 33.49%, rgba(0, 0, 0, 0.8) 61.1%, rgba(0, 0, 0, 0.39) 83.82%))',

      display: 'none',
      lg: { display: 'block' },
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
      // Past lg, the desktop lighting layers (roomLight, shellHalo, topLight, topStreak) light the dialog instead.
      lg: { display: 'none' },
    },
    /** Wrapper around the glass sheet that lets unclipped highlight/rainbow layers bleed past the glass edges. */
    wrapper: {
      // Lets the browser scale the panel and its large light layers as already-rendered layers during the open and
      // close animation (see ScaleFadeTransition), instead of re-rendering them at every intermediate scale, which
      // makes the text jitter.
      willChange: 'transform',
      position: 'relative',
      maxWidth: '500px',
      width: '87.5%',
      // rem, so the panel grows with the user's font size like its contents (650px and 826px at the default 16px), up
      // to the 80% of the window it already stops at.
      lg: { width: '80%', maxWidth: '40.625rem' },
      '2xl': { maxWidth: '51.625rem' },
    },
    /** Light highlight image pinned to the top of the viewport — bleeds past the top edge of the glass to suggest light spilling onto the surrounding screen. Mobile-only: past lg the modal sits in too much surrounding space for the bleed-out effect to read. */
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
      lg: { display: 'none' },
    },
    /**
     * Desktop room light: a soft violet-to-peach light from the top of the screen, behind the panel, drawn as CSS
     * gradients rather than an image, so Chrome dithers it and it does not band. The light's colour is expressed as
     * transparency, so normal blending lights the dark backdrop the way a screen blend would. The box covers only where
     * the light is visible, and is sized in cqw from the panel's width.
     */
    roomLight: {
      display: 'none',
      lg: {
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
     * Desktop light behind the glass: a blurred pink streak along the glass's top edge, which the glass fill tints as
     * it passes through. Its blur and the shared falloff are baked into the image, so the browser composites a plain
     * image rather than a live blur filter under a large mask.
     */
    shellHalo: {
      display: 'none',
      lg: {
        display: 'block',
        position: 'absolute',
        // rem, so the streak keeps its place on the glass's top edge as the glass grows with the font size.
        left: 'calc(50% - 23.75rem)',
        top: '-3.1875rem',
        width: '60.375rem',
        height: '11.875rem',
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
      lg: { display: 'none' },
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
      lg: { display: 'none' },
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
      lg: { display: 'none' },
    },
    /** The glass sheet itself — rounded translucent panel that hosts the dialog content and decorative layers. Lays out its in-flow content as a flex column so the scrollable region (`content`) can shrink to fill whatever space the header and search row leave, rather than overflowing this 80dvh budget and being clipped by `overflow: hidden`. Decorative layers are absolutely positioned and so sit outside this flex flow. */
    glassSheet: {
      color: 'fg',
      fontFamily: 'radioCanada',
      width: '100%',
      boxSizing: 'border-box',
      // Rectangular, so the list's autoscroll still finds the glass as the box that cuts the list off; the clip-path
      // rounds it. Under a rounded overflow clip, WebKit paints the corners of the glass stroke without most of their
      // fade, so Safari lit the two bottom corners brighter than the rest of the edge.
      overflow: 'hidden',
      clipPath: 'inset(0 round 32px)',
      position: 'relative',
      maxHeight: '80dvh',
      // 560px at the default font size, growing with it like the list inside (see CommandUniverse).
      lg: { maxHeight: '35rem' },
      display: 'flex',
      flexDirection: 'column',
    },
    /**
     * Radial fill behind the dialog content. Mobile anchors a darker muted-blue wash near the top, paired with the
     * highlight/rainbow layers above it. Past lg it is the desktop glass fill: an elliptical gradient tilted 32°, opaque
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
      lg: {
        background: 'none',
        overflow: 'hidden',
        // The second layer is a flat floor that the fill never fades below (mask layers add).
        opacity: 'var(--cu-glass-fill-opacity, 1)',
        maskImage: `${desktopLightMaskOnGlass}, linear-gradient(rgba(0, 0, 0, var(--cu-glass-fill-floor, 0)), rgba(0, 0, 0, var(--cu-glass-fill-floor, 0)))`,
        WebkitMaskImage: `${desktopLightMaskOnGlass}, linear-gradient(rgba(0, 0, 0, var(--cu-glass-fill-floor, 0)), rgba(0, 0, 0, var(--cu-glass-fill-floor, 0)))`,
        '&::before': {
          content: '""',
          position: 'absolute',
          left: '47.8%',
          top: '71.1%',
          // Just large enough to cover the largest glass (51.625rem × 35rem, 826 × 560 at the default font size) from
          // the gradient's centre at any rotation: its farthest corner is 36.7rem away. A larger square only adds area
          // for the browser to rasterise. In rem, so the fill grows with the glass.
          width: '75rem',
          height: '75rem',
          transform: 'translate(-50%, -50%) rotate(32deg)',
          background:
            'radial-gradient(37.125rem 28.5rem at 50% 50%, rgb(40, 21, 66) 0%, rgba(127, 123, 206, 0.32) 100%)',
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
    /** Luminance mask that fades the glass stroke off toward the bottom — simulates light falling off across the glass surface. Past lg it is the shared falloff, so the edge fades with the light. */
    glassStrokeMask: {
      position: 'absolute',
      inset: 0,
      borderRadius: '32px',
      pointerEvents: 'none',
      // TEMPORARY: --cu-border-* are dialed by CommandUniverseGlassDebugPanel. At their defaults this is the shared
      // falloff (desktopLightMaskOnGlass); --cu-border-reach stretches it and --cu-border-floor is the least the edge
      // fades to (mask layers add).
      lg: {
        maskImage:
          'radial-gradient(calc(125.07% * var(--cu-border-reach, 1)) calc(141.6% * var(--cu-border-reach, 1)) at calc(50% + 5.5px) -19px, rgba(0, 0, 0, 1.000) 0%, rgba(0, 0, 0, 0.793) 10%, rgba(0, 0, 0, 0.612) 20%, rgba(0, 0, 0, 0.456) 30%, rgba(0, 0, 0, 0.325) 40%, rgba(0, 0, 0, 0.218) 50%, rgba(0, 0, 0, 0.133) 60%, rgba(0, 0, 0, 0.071) 70%, rgba(0, 0, 0, 0.029) 80%, rgba(0, 0, 0, 0.006) 90%, rgba(0, 0, 0, 0.000) 100%), linear-gradient(rgba(0, 0, 0, var(--cu-border-floor, 0)), rgba(0, 0, 0, var(--cu-border-floor, 0)))',
        WebkitMaskImage:
          'radial-gradient(calc(125.07% * var(--cu-border-reach, 1)) calc(141.6% * var(--cu-border-reach, 1)) at calc(50% + 5.5px) -19px, rgba(0, 0, 0, 1.000) 0%, rgba(0, 0, 0, 0.793) 10%, rgba(0, 0, 0, 0.612) 20%, rgba(0, 0, 0, 0.456) 30%, rgba(0, 0, 0, 0.325) 40%, rgba(0, 0, 0, 0.218) 50%, rgba(0, 0, 0, 0.133) 60%, rgba(0, 0, 0, 0.071) 70%, rgba(0, 0, 0, 0.029) 80%, rgba(0, 0, 0, 0.006) 90%, rgba(0, 0, 0, 0.000) 100%), linear-gradient(rgba(0, 0, 0, var(--cu-border-floor, 0)), rgba(0, 0, 0, var(--cu-border-floor, 0)))',
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
      // Past lg, a slate-blue to light-grey edge; glassStrokeMask fades it out below the light.
      lg: {
        background:
          'linear-gradient(180deg, var(--cu-border-top, rgb(127, 139, 175)) 0%, var(--cu-border-bottom, rgb(240, 240, 240)) 100%) border-box',
        borderWidth: 'var(--cu-border-width, 1px)',
        opacity: 'var(--cu-border-opacity, 1)',
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
     * Desktop light over the panel, contents included: soft colour washes, violet from above and a neutral warmth
     * below, drawn as CSS gradients so Chrome dithers them and they do not band. Being above the contents, it tints
     * the text near the light. Sized in cqw from the panel's width.
     */
    topLight: {
      display: 'none',
      lg: {
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
    /** Desktop: a faint blurred white streak just inside the glass's top edge, above the contents. Its blur is baked into the image, so the browser composites a plain image rather than a live blur filter. */
    topStreak: {
      display: 'none',
      lg: {
        display: 'block',
        position: 'absolute',
        // rem, like shellHalo, so it grows with the glass.
        left: 'calc(50% - 24.6875rem)',
        top: '-4.125rem',
        width: '60.375rem',
        height: '11.875rem',
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
      // The native scrollbar is hidden and replaced by the custom ScrollbarThumb overlay (rendered in
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
