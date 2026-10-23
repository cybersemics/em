// PROTOTYPE — visual experiment only, not for merge.
//
// DropdownRadialBlur: a radial progressive blur behind a Dropdown's light and rows, over the surface it opens on.
// Strongest at the light's core and easing off outward, the radial analogue of ProgressiveBlur: a stack of fixed
// nested discs, each with its own backdrop-filter blur and an elliptical, softly dissolving mask, adding up to the core
// blur at the centre and easing through the edge blur at the outer ellipse to nothing past it (see layoutDiscs).
// On by default; a design-dials switch turns it off.
//
// DropdownRadialBlurEditor: its extents on canvas, through the shared EllipseCanvasEditor: the inner (fully blurred)
// and outer (edge blur) ellipses, the centre offset and the shape. Drags set the same dials as the panel.
import { CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { DROPDOWN_Z_INDEX, useDropdown } from './Dropdown'
import EllipseCanvasEditor from './EllipseCanvasEditor'
import useCanvasEditing, { setDial } from './canvasEditing'
import { readDial } from './dials'

/** The blur's current geometry and strength, from the dials (with their defaults). */
const readBlur = () => {
  /** Reads a numeric dial, falling back when it is unset or not a number. */
  const num = (name: string, fallback: number) => {
    const value = parseFloat(readDial(name, String(fallback)))
    return Number.isFinite(value) ? value : fallback
  }
  return {
    enabled: readDial('--sort-dropdown-blur-enabled', 'on') === 'on',
    coreBlur: num('--sort-dropdown-blur-core', 6),
    edgeBlur: num('--sort-dropdown-blur-edge', 2),
    inner: num('--sort-dropdown-blur-inner', 200),
    outer: num('--sort-dropdown-blur-outer', 462),
    aspect: num('--sort-dropdown-blur-aspect', 0.94),
    offsetX: num('--sort-dropdown-blur-offset-x', 0),
    offsetY: num('--sort-dropdown-blur-offset-y', 0),
    layers: Math.round(Math.min(12, Math.max(1, num('--sort-dropdown-blur-layers', 4)))),
  }
}

/** Smoothstep: 0 → 1 with zero slope at both ends, so a falloff has no visible start or end. */
const smoothstep = (t: number) => {
  const x = Math.min(1, Math.max(0, t))
  return x * x * (3 - 2 * x)
}

/**
 * Lays out the blur's discs. The look is a target blur radius by distance from the centre (along the ellipse's
 * horizontal radius): the core blur out to the inner radius, easing (smoothstep) down to the edge blur, then easing on
 * to nothing by the outer radius, so the blur never stops at an edge and ends where the outer ellipse is drawn. The
 * last stretch, from the edge blur to nothing, takes the outer half of the space between the inner and outer radii and
 * eases out (quadratically): it falls quickly at first and lingers below a pixel, where text turns legible again, so
 * the return to sharp is spread out rather than happening in one band.
 *
 * Backdrop blurs stack: a disc drawn over another blurs the already-blurred result, so their radii add in quadrature
 * (σ² sums). So rather than rings each carrying one blur, the layers are nested discs, outermost first: each adds a
 * small extra blur inside its edge, and the total at any point is the sum of the discs covering it. The levels it
 * builds up through are spaced quadratically (for n layers, core × (k/n)²), so the outermost steps, where the eye
 * notices the difference between sharp and slightly soft, are fractions of a pixel. Each disc's edge sits where the
 * target falls halfway between its two levels and dissolves (smoothstep) over half the gap to its neighbours, so every
 * point is at most one small, gradual step between two similar blurs. A mask fading a backdrop blur in and out
 * cross-dissolves sharp and blurred rather than blurring less, which is why the steps themselves must be small.
 */
const layoutDiscs = (blur: ReturnType<typeof readBlur>) => {
  const core = Math.max(0, blur.coreBlur)
  const edge = Math.min(core, Math.max(0, blur.edgeBlur))
  const inner = Math.max(0, blur.inner)
  const outer = Math.max(inner + 1, blur.outer)
  // Where the edge blur is reached; past it the blur eases to nothing by the outer radius.
  const settle = edge > 0 ? outer - 0.5 * (outer - inner) : outer
  /** The target blur radius at distance d. */
  const target = (d: number) =>
    d <= inner
      ? core
      : d <= settle
        ? core + (edge - core) * smoothstep((d - inner) / (settle - inner))
        : d <= outer
          ? edge * (1 - (d - settle) / (outer - settle)) ** 2
          : 0
  /** The distance at which the target first falls to a blur radius. */
  const reach = (radius: number) => {
    for (let d = 0; d <= outer; d++) if (target(d) <= radius) return d
    return outer
  }
  const n = blur.layers
  // levels[k]: the blur inside discs 0..k-1 (outermost first); levels[0] = 0 outside them all, levels[n] = core.
  const levels = Array.from({ length: n + 1 }, (_, k) => core * (k / n) ** 2)
  const edges = Array.from({ length: n }, (_, j) => reach((levels[j] + levels[j + 1]) / 2))
  return edges.map((at, j) => {
    const gapOut = j === 0 ? Math.max(40, outer - at) : edges[j - 1] - at
    const gapIn = j === n - 1 ? at : at - edges[j + 1]
    return {
      at,
      // Half the gap to the nearer neighbour, so neighbouring dissolves meet without overlapping.
      feather: Math.max(16, 0.5 * Math.min(gapOut, gapIn)),
      // The extra blur this disc adds: the next level up, less what the discs under it already give.
      radius: Math.sqrt(Math.max(0, levels[j + 1] ** 2 - levels[j] ** 2)),
    }
  })
}

/** Mask stops dissolving from opaque to clear along smoothstep between two distances (as % of the gradient's radius). */
const dissolveStops = (from: number, to: number, toPct: (d: number) => number) =>
  [0, 0.2, 0.4, 0.5, 0.6, 0.8, 1]
    .map(t => `rgba(0, 0, 0, ${(1 - smoothstep(t)).toFixed(3)}) ${toPct(from + (to - from) * t).toFixed(2)}%`)
    .join(', ')

/** The radial progressive blur, offset from the centre it's given: the light's centre, in viewport coordinates. */
const DropdownRadialBlur = ({ centre }: { centre: { x: number; y: number } }) => {
  const { isOpen, timing, transition } = useDropdown()
  const blur = readBlur()
  if (!blur.enabled) return null

  const cx = centre.x + blur.offsetX
  const cy = centre.y + blur.offsetY
  const aspect = Math.max(0.05, blur.aspect)

  return (
    <>
      {/* Outermost first: each disc blurs what the discs under it have already blurred. */}
      {layoutDiscs(blur).map(({ at, feather, radius }, j) => {
        // Each layer covers only its own disc (and its dissolve), not the whole screen: a backdrop blur costs in
        // proportion to its area, and inner discs are small.
        const halfWidth = at + feather + 2
        const halfHeight = halfWidth * aspect
        /** A distance from the centre, as a percentage of this layer's gradient radius. */
        const toPct = (d: number) => (Math.max(0, d) / halfWidth) * 100
        const mask = `radial-gradient(${halfWidth}px ${halfHeight}px at ${halfWidth}px ${halfHeight}px, black ${toPct(at - feather).toFixed(2)}%, ${dissolveStops(at - feather, at + feather, toPct)}, transparent 100%)`
        const style: CSSProperties = {
          position: 'fixed',
          left: cx - halfWidth,
          top: cy - halfHeight,
          width: halfWidth * 2,
          height: halfHeight * 2,
          pointerEvents: 'none',
          zIndex: DROPDOWN_Z_INDEX,
          backdropFilter: `blur(${radius.toFixed(2)}px)`,
          WebkitBackdropFilter: `blur(${radius.toFixed(2)}px)`,
          maskImage: mask,
          WebkitMaskImage: mask,
          opacity: isOpen ? 1 : 0,
          transition: transition(['opacity'], { dur: timing.light }),
        }
        return createPortal(<div key={j} style={style} />, document.body)
      })}
    </>
  )
}

/** The canvas editor for the blur's extents (inner and outer radius, shape, offset), while the menu is open. */
export const DropdownRadialBlurEditor = ({ centre }: { centre: { x: number; y: number } }) => {
  const { isOpen } = useDropdown()
  const target = useCanvasEditing()
  if (target !== 'blur' || !isOpen) return null
  return (
    <EllipseCanvasEditor
      centre={centre}
      read={readBlur}
      write={{
        offset: (x, y) => {
          setDial('--sort-dropdown-blur-offset-x', `${x}px`)
          setDial('--sort-dropdown-blur-offset-y', `${y}px`)
        },
        inner: radius => setDial('--sort-dropdown-blur-inner', `${radius}px`),
        outer: radius => setDial('--sort-dropdown-blur-outer', `${radius}px`),
        aspect: aspect => setDial('--sort-dropdown-blur-aspect', String(aspect)),
      }}
      colours={{ inner: 'rgb(255, 170, 120)', outer: 'rgb(140, 220, 255)' }}
      labels={{ inner: 'Fully blurred core', outer: 'Outer edge of the blur' }}
    />
  )
}

export default DropdownRadialBlur
