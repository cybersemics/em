// PROTOTYPE — visual experiment only, not for merge.
//
// DropdownLight: the glow behind a Dropdown, from the em design file (Figma node 14593:170852).
// An even dim, then a tint, Figma's background-glow image, a band, a soft additive bloom and a
// selection glow, gathered around the options. Also applies the surface mask (see useSurfaceMask).
//
// Design dials: the dim, and the glow's origin offset, spread and intensity, read --sort-dropdown-* custom
// properties set by DropdownDebugPanel (the glow's through its canvas editor, DropdownLightEditor below), with the
// current design values as fallbacks. The offset moves the light's centre, and so every light layer except the
// selection glow; the mask and the radial blur are positioned from the light's centre, so they follow it.
//
// Each layer (tint, glow image, band, bloom, selection glow) also has its own dials, read by readLayer: visibility,
// opacity, blend mode, an offset and a size relative to where it sits now, and where its elliptical falloff starts and
// ends. Their fallbacks reproduce the design exactly. The group's spread, intensity and origin apply on top.
//
// Every layer is its own fixed element portalled to <body>, so each blends with the whole page
// (a shared fixed wrapper would be a stacking context and isolate the blend modes).
import { CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import useBreakpoint from '../../hooks/useBreakpoint'
import { DROPDOWN_LAYER_Z, useDropdown } from './Dropdown'
import DropdownMaskEditor from './DropdownMaskEditor'
import DropdownRadialBlur, { DropdownRadialBlurEditor } from './DropdownRadialBlur'
import EllipseCanvasEditor from './EllipseCanvasEditor'
import useCanvasEditing, { setDial } from './canvasEditing'
import { readDial } from './dials'
import useSurfaceMask from './useSurfaceMask'

/** Reads a numeric dial, falling back when it is unset or not a number. */
const num = (name: string, fallback: number) => {
  const value = parseFloat(readDial(name, String(fallback)))
  return Number.isFinite(value) ? value : fallback
}

/** Figma Rectangle 752: transparent on the left to #434378 on the right. */
const SURFACE_TINT = 'linear-gradient(90deg, rgba(10, 10, 18, 0) 0%, rgba(67, 67, 120, 1) 100%)'

/**
 * The light group's design values per layout. Desktop (md and up) was tuned separately: a dimmer light, nudged left
 * and down from the options.
 */
const GLOW_DEFAULTS = {
  mobile: { intensity: 1.2, offsetX: 0, offsetY: 0 },
  desktop: { intensity: 0.84, offsetX: -20, offsetY: 52 },
}

/** The light group's design values for the current layout. */
const glowDefaults = (isDesktop: boolean) => (isDesktop ? GLOW_DEFAULTS.desktop : GLOW_DEFAULTS.mobile)

/** The light layers' design colours, as hex (the dials' fallbacks). */
const LIGHT_COLOURS = {
  /** Figma Rectangle 752's opaque end, shared by the tint and the band (each has its own dial). */
  tint: '#434378',
  band: '#434378',
  bloomCentre: '#7869e1',
  bloomEdge: '#2c2c85',
  selection: '#aaa0ff',
}

/** Reads a colour dial: a six-digit hex, or the fallback when it is unset or malformed. */
const colourDial = (name: string, fallback: string) => {
  const value = readDial(name, fallback)
  return /^#[0-9a-f]{6}$/i.test(value) ? value.toLowerCase() : fallback
}

/** A hex colour as rgba() with an alpha. */
const rgba = (hex: string, alpha: number) => {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`
}

/** Mixes two hex colours, t of the way from a to b, as rgba() with an alpha. */
const mix = (a: string, b: string, t: number, alpha: number) => {
  const pa = parseInt(a.slice(1), 16)
  const pb = parseInt(b.slice(1), 16)
  /** One channel of the mix, by its bit offset in the hex value. */
  const channel = (shift: number) => Math.round(((pa >> shift) & 255) * (1 - t) + ((pb >> shift) & 255) * t)
  return `rgba(${channel(16)}, ${channel(8)}, ${channel(0)}, ${alpha})`
}

/** The tint's gradient (Figma Rectangle 752): transparent on the left to the colour on the right. */
const tintGradient = (colour: string) =>
  colour === LIGHT_COLOURS.tint
    ? SURFACE_TINT
    : `linear-gradient(90deg, rgba(10, 10, 18, 0) 0%, ${rgba(colour, 1)} 100%)`

/**
 * The bloom's colour stops, from its centre colour to its edge colour. The design's stops are hand-picked, not an
 * even blend, so they're used exactly while both colours are the design's; otherwise the middle stops blend between
 * the two, about where the design's sit.
 */
const bloomStops = (centre: string, edge: string): [string, number][] =>
  centre === LIGHT_COLOURS.bloomCentre && edge === LIGHT_COLOURS.bloomEdge
    ? [
        ['rgba(120, 105, 225, 0.3)', 0],
        ['rgba(100, 88, 210, 0.17)', 0.35],
        ['rgba(70, 65, 170, 0.05)', 0.7],
        ['rgba(44, 44, 133, 0)', 1],
      ]
    : [
        [rgba(centre, 0.3), 0],
        [mix(centre, edge, 0.26, 0.17), 0.35],
        [mix(centre, edge, 0.66, 0.05), 0.7],
        [rgba(edge, 0), 1],
      ]

/** The light's own layers, each with its own dials (--sort-dropdown-<id>-*). */
type LightLayerId = 'tint' | 'image' | 'band' | 'bloom' | 'selection'

/** Each layer's design values: its opacity, blend mode, and where its elliptical falloff starts and ends (%). */
const LIGHT_LAYER_DEFAULTS: Record<
  LightLayerId,
  { opacity: number; blend: string; falloffStart: number; falloffEnd: number }
> = {
  tint: { opacity: 0.28, blend: 'normal', falloffStart: 30, falloffEnd: 100 },
  image: { opacity: 0.22, blend: 'screen', falloffStart: 35, falloffEnd: 100 },
  band: { opacity: 0.5, blend: 'screen', falloffStart: 0, falloffEnd: 100 },
  bloom: { opacity: 1, blend: 'plus-lighter', falloffStart: 0, falloffEnd: 100 },
  selection: { opacity: 0.14, blend: 'plus-lighter', falloffStart: 0, falloffEnd: 100 },
}

/** A layer's dials, with its design values as fallbacks. */
const readLayer = (id: LightLayerId) => {
  const d = LIGHT_LAYER_DEFAULTS[id]
  return {
    visible: readDial(`--sort-dropdown-${id}-visible`, '1') !== '0',
    opacity: num(`--sort-dropdown-${id}-opacity`, d.opacity),
    blend: readDial(`--sort-dropdown-${id}-blend`, d.blend),
    offsetX: num(`--sort-dropdown-${id}-offset-x`, 0),
    offsetY: num(`--sort-dropdown-${id}-offset-y`, 0),
    size: Math.max(0.05, num(`--sort-dropdown-${id}-size`, 1)),
    falloffStart: num(`--sort-dropdown-${id}-falloff-start`, d.falloffStart),
    falloffEnd: num(`--sort-dropdown-${id}-falloff-end`, d.falloffEnd),
  }
}

/** A percentage for a gradient stop, without float noise (0, 20, 44.5). */
const pct = (value: number) => `${Number(value.toFixed(2))}%`

/**
 * Stop positions spread between a falloff's start and end, at the design's fractions of the way along: so with the
 * design's start 0 and end 100 they are exactly the design's stops.
 */
const stopsBetween = (start: number, end: number, stops: [string, number][]) =>
  stops.map(([colour, at]) => `${colour} ${pct(start + (end - start) * at)}`).join(', ')

/**
 * A layer's box, its elliptical falloff's centre as fractions of the box, and so (closest-side) its radii. Size scales
 * the box about the ellipse's centre, so a layer grows in place.
 */
const layerGeometry = (
  box: { left: number; top: number; width: number; height: number },
  fx: number,
  fy: number,
  size: number,
) => {
  const cx = box.left + box.width * fx
  const cy = box.top + box.height * fy
  const width = box.width * size
  const height = box.height * size
  return {
    box: { left: cx - fx * width, top: cy - fy * height, width, height },
    centre: { x: cx, y: cy },
    // closest-side: the distance to the nearest edge on each axis.
    rx: Math.min(fx, 1 - fx) * width,
    ry: Math.min(fy, 1 - fy) * height,
  }
}

/** A fixed, non-interactive layer portalled to <body>. */
const Layer = ({ style }: { style: CSSProperties }) =>
  createPortal(
    <div style={{ position: 'fixed', pointerEvents: 'none', zIndex: DROPDOWN_LAYER_Z.light, ...style }} />,
    document.body,
  )

/**
 * The light on canvas, through the shared EllipseCanvasEditor: the centre handle moves its origin, the outer handle
 * sets the spread so the bloom's (scaled) outline sits under it, and the value handle sets the intensity.
 */
const DropdownLightEditor = ({
  origin,
  bloom,
  isDesktop,
}: {
  origin: { x: number; y: number }
  bloom: { w: number; h: number }
  isDesktop: boolean
}) => {
  const defaults = glowDefaults(isDesktop)
  const { isOpen } = useDropdown()
  const target = useCanvasEditing()
  if (target !== 'light' || !isOpen) return null
  return (
    <EllipseCanvasEditor
      centre={origin}
      read={() => ({
        offsetX: num('--sort-dropdown-glow-offset-x', defaults.offsetX),
        offsetY: num('--sort-dropdown-glow-offset-y', defaults.offsetY),
        inner: 0,
        outer: (bloom.w / 2) * num('--sort-dropdown-glow-spread', 2.2),
        aspect: bloom.h / bloom.w,
      })}
      write={{
        offset: (x, y) => {
          setDial('--sort-dropdown-glow-offset-x', `${x}px`)
          setDial('--sort-dropdown-glow-offset-y', `${y}px`)
        },
        // The spread scales every light layer about the centre; the bloom's outline is its width × spread.
        outer: radius => setDial('--sort-dropdown-glow-spread', (radius / (bloom.w / 2)).toFixed(2)),
      }}
      colours={{ inner: 'rgb(255, 225, 120)', outer: 'rgb(255, 225, 120)' }}
      labels={{ inner: 'Light', outer: 'Spread of the light' }}
      valueHandle={{
        label: 'intensity',
        read: () => num('--sort-dropdown-glow-intensity', defaults.intensity),
        write: value => setDial('--sort-dropdown-glow-intensity', String(value)),
        perPx: 0.01,
        min: 0,
        max: 2,
        digits: 2,
      }}
    />
  )
}

/**
 * One light layer on canvas: the centre handle sets its offset, the outer handle its size (so its falloff's end sits
 * under the handle) and the inner handle where its falloff starts. Its shape is its box's, so there is no shape handle.
 * The centre is the layer's ellipse centre on screen before its own offset; the scale is the group's spread (1 for
 * the selection glow, which doesn't spread).
 */
const LightLayerEditor = ({
  id,
  centre,
  rx,
  ry,
  scale,
  colour,
}: {
  id: LightLayerId
  centre: { x: number; y: number }
  /** The ellipse's radii at a size of 1, before the spread (px). */
  rx: number
  ry: number
  scale: number
  colour: string
}) => {
  const { isOpen } = useDropdown()
  const target = useCanvasEditing()
  if (target !== id || !isOpen) return null
  return (
    <EllipseCanvasEditor
      centre={centre}
      read={() => {
        const layer = readLayer(id)
        const r = rx * layer.size * scale
        return {
          offsetX: layer.offsetX,
          offsetY: layer.offsetY,
          inner: (r * layer.falloffStart) / 100,
          outer: (r * layer.falloffEnd) / 100,
          aspect: ry / Math.max(1, rx),
        }
      }}
      write={{
        offset: (x, y) => {
          setDial(`--sort-dropdown-${id}-offset-x`, `${x}px`)
          setDial(`--sort-dropdown-${id}-offset-y`, `${y}px`)
        },
        inner: radius => {
          const layer = readLayer(id)
          const r = Math.max(1, rx * layer.size * scale)
          setDial(`--sort-dropdown-${id}-falloff-start`, `${Math.round((radius / r) * 100)}`)
        },
        // Size the layer so its falloff's end lands under the handle.
        outer: radius => {
          const layer = readLayer(id)
          const size = radius / Math.max(1, (rx * scale * layer.falloffEnd) / 100)
          setDial(`--sort-dropdown-${id}-size`, size.toFixed(2))
        },
      }}
      colours={{ inner: colour, outer: colour }}
      labels={{ inner: 'Where its falloff starts', outer: 'Its size (where the falloff ends)' }}
    />
  )
}

/** The light behind a Dropdown: its layers, the surface mask and radial blur under it, and their canvas editors. */
const DropdownLight = ({ surface }: { surface: HTMLElement | null }) => {
  const { open, isOpen, anchorRect, menuRect, placement, selectedY, selectedTravel, timing, transition, lightMotion } =
    useDropdown()
  // The light's origin offset, re-read on every render (the Dropdown re-renders its layers when a dial changes).
  // Desktop (md and up) has its own design values for the light group.
  const isDesktop = useBreakpoint('md')
  const defaults = glowDefaults(isDesktop)
  const offsetX = num('--sort-dropdown-glow-offset-x', defaults.offsetX)
  const offsetY = num('--sort-dropdown-glow-offset-y', defaults.offsetY)
  // The light's centre before the offset: on the options, 60% across. The light editor works from here.
  const origin = { x: menuRect.left + menuRect.width * 0.6, y: menuRect.top + menuRect.height / 2 }
  // The light's centre, where the bloom, the surface mask and the radial blur sit.
  const lightCentre = { x: origin.x + offsetX, y: origin.y + offsetY }
  useSurfaceMask(surface, lightCentre)

  if (!anchorRect) return null

  /** Fades a light layer in to its opacity, scaled by the intensity dial. */
  const fade = (opacity: number): CSSProperties => ({
    opacity: isOpen ? `calc(${opacity} * var(--sort-dropdown-glow-intensity, ${defaults.intensity}))` : 0,
    transition: transition(['opacity'], { dur: timing.light }),
  })

  // The box the light is laid out in: the options' bounds, padded, moved by the origin offset.
  const box = {
    left: menuRect.left - 60 + offsetX,
    top: menuRect.top - 40 + offsetY,
    width: menuRect.width + 100,
    height: menuRect.height + 80,
  }
  // Bloom: on the light's centre, sized to the options.
  const bloom = { x: lightCentre.x, y: lightCentre.y, w: menuRect.width + 280, h: menuRect.height + 260 }
  const padded = { left: box.left - 120, top: box.top - 120, width: box.width + 240, height: box.height + 240 }
  // The group's spread, as a number, for placing the layers' canvas editors.
  const spreadScale = num('--sort-dropdown-glow-spread', 2.2)
  // The group's visibility: hides the tint, glow image, band and bloom together.
  const groupVisible = readDial('--sort-dropdown-glow-visible', '1') !== '0'
  // The group's hue shift (deg), rotating every light layer's colour together; none by default.
  const groupHue = num('--sort-dropdown-glow-hue', 0)
  /** A layer's filter: its own filters, then the group's hue shift. None when there's neither, as in the design. */
  const hueFilter = (own = ''): CSSProperties => {
    const value = [own, groupHue ? `hue-rotate(${groupHue}deg)` : ''].filter(Boolean).join(' ')
    return value ? { filter: value } : {}
  }
  // The glow image is a bitmap, so it's recoloured by filters rather than a colour.
  const imageHue = num('--sort-dropdown-image-hue', 0)
  const imageSaturate = num('--sort-dropdown-image-saturate', 100)
  const selectionColour = colourDial('--sort-dropdown-selection-colour', LIGHT_COLOURS.selection)

  const tint = readLayer('tint')
  const image = readLayer('image')
  const band = readLayer('band')
  const bloomLayer = readLayer('bloom')
  const selection = readLayer('selection')
  const tintGeo = layerGeometry(padded, 0.65, 0.35, tint.size)
  const imageGeo = layerGeometry(padded, 0.6, 0.4, image.size)
  const bandGeo = layerGeometry(
    { left: box.left + box.width * 0.17, top: box.top, width: box.width * 0.83 + 40, height: box.height },
    0.625,
    0.45,
    band.size,
  )
  const bloomGeo = layerGeometry(
    { left: bloom.x - bloom.w / 2, top: bloom.y - bloom.h / 2, width: bloom.w, height: bloom.h },
    0.5,
    0.5,
    bloomLayer.size,
  )
  const selectionGeo = layerGeometry(
    { left: anchorRect.right + 43 - 286, top: selectedY - 35, width: 286, height: 70 },
    0.5,
    0.5,
    selection.size,
  )

  /**
   * Grows or shrinks a light layer by the spread dial, about the light's centre (the bloom's), so every layer
   * spreads together. Uses the scale property, which composes with the transform that lightMotion animates.
   */
  const spread = (left: number, top: number): CSSProperties => ({
    scale: 'var(--sort-dropdown-glow-spread, 2.2)',
    transformOrigin: `${bloom.x - left}px ${bloom.y - top}px`,
  })

  /** A layer's own offset, applied after the spread (the translate property), so it is in screen pixels. */
  const nudge = (layer: ReturnType<typeof readLayer>): CSSProperties => ({
    translate: `${layer.offsetX}px ${layer.offsetY}px`,
  })

  /** Where a spread layer's ellipse centre lands on screen, before its own offset. */
  const spreadPoint = (point: { x: number; y: number }) => ({
    x: bloom.x + spreadScale * (point.x - bloom.x),
    y: bloom.y + spreadScale * (point.y - bloom.y),
  })

  return (
    <>
      {/* Radial progressive blur (on by default): first, so the dim, the light and the rows paint above it. */}
      <DropdownRadialBlur centre={lightCentre} />

      {/* Even dim: a plain dark fill over the viewport (no backdrop filter, so it's cheap). Darkens inside and
          outside the surface alike, which flattens its edge, and keeps what's behind the glass from glaring. */}
      <Layer
        style={{
          inset: 0,
          background: 'rgb(8, 8, 16)',
          opacity: isOpen
            ? 'calc(var(--sort-dropdown-scrim-opacity, 0.65) * var(--sort-dropdown-scrim-visible, 1))'
            : 0,
          transition: transition(['opacity'], { dur: timing.light }),
        }}
      />

      {/* Tint (Figma Rectangle 752): a free-floating ellipse that fades out before its own bounds. */}
      {groupVisible && tint.visible ? (
        <Layer
          style={{
            ...tintGeo.box,
            background: tintGradient(colourDial('--sort-dropdown-tint-colour', LIGHT_COLOURS.tint)),
            ...hueFilter(),
            maskImage: `radial-gradient(closest-side at 65% 35%, black ${pct(tint.falloffStart)}, transparent ${pct(tint.falloffEnd)})`,
            mixBlendMode: tint.blend as CSSProperties['mixBlendMode'],
            ...fade(tint.opacity),
            ...spread(tintGeo.box.left, tintGeo.box.top),
            ...nudge(tint),
          }}
        />
      ) : null}

      {/* Background glow (Figma "Background glow" image, exported): a soft lavender field. Screen rather than
          Figma's colour dodge, which blew bright spots behind the glass up into a glaring patch. */}
      {groupVisible && image.visible ? (
        <Layer
          style={{
            ...imageGeo.box,
            backgroundImage: 'url(/img/glow-menu/background-glow.png)',
            backgroundSize: '100% 100%',
            mixBlendMode: image.blend as CSSProperties['mixBlendMode'],
            ...hueFilter(
              [imageHue ? `hue-rotate(${imageHue}deg)` : '', imageSaturate !== 100 ? `saturate(${imageSaturate}%)` : '']
                .filter(Boolean)
                .join(' '),
            ),
            maskImage: `radial-gradient(closest-side at 60% 40%, black ${pct(image.falloffStart)}, transparent ${pct(image.falloffEnd)})`,
            ...fade(image.opacity),
            ...spread(imageGeo.box.left, imageGeo.box.top),
            ...nudge(image),
          }}
        />
      ) : null}

      {/* Band (inside Figma's dodge frame): brightens toward the menu, feathered on every side. */}
      {groupVisible && band.visible ? (
        <Layer
          style={{
            ...bandGeo.box,
            background: tintGradient(colourDial('--sort-dropdown-band-colour', LIGHT_COLOURS.band)),
            ...hueFilter(),
            // One elliptical falloff centred where the old ramps' full-strength core was (62.5% across, 45% down).
            // Two linear ramps multiplied together have rectangular contours, and their flat core was a lit rectangle:
            // that read as a rectangular cut-off rather than light. closest-side keeps the ellipse inside the layer, so
            // it reaches zero before any of its edges.
            maskImage: `radial-gradient(closest-side at 62.5% 45%, ${stopsBetween(band.falloffStart, band.falloffEnd, [
              ['black', 0],
              ['rgba(0, 0, 0, 0.9)', 0.2],
              ['rgba(0, 0, 0, 0.62)', 0.45],
              ['rgba(0, 0, 0, 0.3)', 0.7],
              ['rgba(0, 0, 0, 0.08)', 0.88],
              ['transparent', 1],
            ])})`,
            mixBlendMode: band.blend as CSSProperties['mixBlendMode'],
            ...fade(band.opacity),
            ...spread(bandGeo.box.left, bandGeo.box.top),
            ...nudge(band),
          }}
        />
      ) : null}

      {/* Bloom (Figma "CC glow"): a soft lavender light, additive. */}
      {groupVisible && bloomLayer.visible ? (
        <Layer
          style={{
            ...bloomGeo.box,
            borderRadius: '50%',
            background: `radial-gradient(closest-side, ${stopsBetween(
              bloomLayer.falloffStart,
              bloomLayer.falloffEnd,
              bloomStops(
                colourDial('--sort-dropdown-bloom-centre-colour', LIGHT_COLOURS.bloomCentre),
                colourDial('--sort-dropdown-bloom-edge-colour', LIGHT_COLOURS.bloomEdge),
              ),
            )})`,
            ...hueFilter(),
            mixBlendMode: bloomLayer.blend as CSSProperties['mixBlendMode'],
            ...lightMotion(0.3),
            ...fade(bloomLayer.opacity),
            // fade() replaces lightMotion's transition; keep the grow-in as well.
            transition: transition(['opacity', 'transform'], { dur: timing.light }),
            ...spread(bloomGeo.box.left, bloomGeo.box.top),
            ...nudge(bloomLayer),
          }}
        />
      ) : null}

      {/* Selection glow (Figma "Selection highlight"): a faint additive ellipse behind the selected row. It follows the
          selected row, which leaves the anchor when the menu drops down, and doesn't spread with the light. */}
      {selection.visible ? (
        <Layer
          style={{
            ...selectionGeo.box,
            background: `radial-gradient(closest-side, ${rgba(selectionColour, 1)} ${pct(selection.falloffStart)}, ${rgba(selectionColour, 0)} ${pct(selection.falloffEnd)})`,
            ...hueFilter('blur(25px)'),
            mixBlendMode: selection.blend as CSSProperties['mixBlendMode'],
            ...fade(selection.opacity),
            ...nudge(selection),
            // Moves and fades as part of the selected row, on the rows' clock rather than the light's. When the menu
            // drops down, the row slides between its place and the anchor (selectedTravel); the glow takes the same
            // transform, and jumps straight to a newly picked row so it slides with it rather than chasing it. When the
            // menu opens around the selection, the whole menu glides by its top, so the glow glides its top too.
            // Opening, it lights up with the row; closing, it stays lit while the row slides home, then fades with the
            // row's crossfade into the button's glyph (see DropdownRows).
            transform: selectedTravel.transform,
            transition: `${transition(placement === 'around' ? ['top', 'transform'] : ['transform'])}, ${
              open ? transition(['opacity']) : transition(['opacity'], { delay: timing.content })
            }`,
          }}
        />
      ) : null}

      {/* The canvas editors, shown while editing the light, the mask or the blur from the dials panel. */}
      <DropdownLightEditor origin={origin} bloom={bloom} isDesktop={isDesktop} />
      {(
        [
          ['tint', tintGeo, true, 'rgb(150, 150, 255)'],
          ['image', imageGeo, true, 'rgb(200, 200, 230)'],
          ['band', bandGeo, true, 'rgb(130, 190, 255)'],
          ['bloom', bloomGeo, true, 'rgb(200, 160, 255)'],
          ['selection', selectionGeo, false, 'rgb(255, 200, 255)'],
        ] as [LightLayerId, ReturnType<typeof layerGeometry>, boolean, string][]
      ).map(([id, geo, spreads, colour]) => {
        // The editor's radii are at a size of 1: undo the size already applied to the geometry.
        const size = readLayer(id).size
        return (
          <LightLayerEditor
            key={id}
            id={id}
            centre={spreads ? spreadPoint(geo.centre) : geo.centre}
            rx={geo.rx / size}
            ry={geo.ry / size}
            scale={spreads ? spreadScale : 1}
            colour={colour}
          />
        )
      })}
      <DropdownMaskEditor centre={lightCentre} />
      <DropdownRadialBlurEditor centre={lightCentre} />
    </>
  )
}

export default DropdownLight
