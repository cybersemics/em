// PROTOTYPE — visual experiment only, not for merge.
//
// DropdownRadialBlur: a radial progressive blur behind a Dropdown's light and rows, over the surface it opens on.
// Strongest at the light's core and easing off outward, the radial analogue of ProgressiveBlur: a stack of fixed
// layers, each with its own backdrop-filter blur and an elliptical ring mask, so the blur steps down smoothly from
// the core blur at the centre to the edge blur at the outer ellipse. On by default; a design-dials switch turns it off.
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

/** The radial progressive blur, offset from the centre it's given: the light's centre, in viewport coordinates. */
const DropdownRadialBlur = ({ centre }: { centre: { x: number; y: number } }) => {
  const { isOpen, timing, transition } = useDropdown()
  const blur = readBlur()
  if (!blur.enabled) return null

  const cx = centre.x + blur.offsetX
  const cy = centre.y + blur.offsetY
  // Every ring is laid out on the outer ellipse: percentages below are of its radii.
  const rx = Math.max(1, blur.outer)
  const ry = rx * blur.aspect
  // The fully blurred core, as a percentage of the outer ellipse.
  const innerPct = Math.min(99, (Math.max(0, blur.inner) / rx) * 100)
  const n = blur.layers

  return (
    <>
      {Array.from({ length: n }).map((_, i) => {
        // Blur eases off quadratically from the core blur to the edge blur, as in ProgressiveBlur.
        const t = n <= 1 ? 1 : (n - 1 - i) / (n - 1)
        const radius = blur.edgeBlur + t * t * (blur.coreBlur - blur.edgeBlur)
        // Layer 0 is solid from the centre to the end of the core; the rest are rings spread across the falloff
        // between the core and the outer ellipse, each feathered into its neighbours so no ring edge shows.
        const slice = (100 - innerPct) / n
        const start = i === 0 ? 0 : innerPct + slice * i
        const end = innerPct + slice * (i + 1)
        const feather = slice * 1.5
        const lead = Math.max(0, start - feather)
        const trail = Math.min(100, end + feather)
        // A single layer carries the core blur and fades out from the end of the core to the outer ellipse.
        const mask =
          n === 1
            ? `radial-gradient(${rx}px ${ry}px at ${cx}px ${cy}px, black ${innerPct}%, transparent 100%)`
            : i === 0
              ? `radial-gradient(${rx}px ${ry}px at ${cx}px ${cy}px, black ${end}%, transparent ${trail}%)`
              : `radial-gradient(${rx}px ${ry}px at ${cx}px ${cy}px, transparent ${lead}%, black ${start}%, black ${end}%, transparent ${trail}%)`
        const style: CSSProperties = {
          position: 'fixed',
          inset: 0,
          pointerEvents: 'none',
          zIndex: DROPDOWN_Z_INDEX,
          backdropFilter: `blur(${radius}px)`,
          WebkitBackdropFilter: `blur(${radius}px)`,
          maskImage: mask,
          WebkitMaskImage: mask,
          opacity: isOpen ? 1 : 0,
          transition: transition(['opacity'], { dur: timing.light }),
        }
        return createPortal(<div key={i} style={style} />, document.body)
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
