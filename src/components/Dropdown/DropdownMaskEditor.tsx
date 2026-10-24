// PROTOTYPE — visual experiment only, not for merge.
//
// DropdownMaskEditor: the surface mask's geometry on canvas, through the shared EllipseCanvasEditor. The inner ellipse
// is the fully hidden core and the outer one is where the content is fully visible again; the centre handle sets the
// offset from the light's centre and the shape handle the aspect. Drags set the mask's dials through the panel, in
// the units useSurfaceMask reads them in: the core as % of the mask ellipse, the size as the ellipse's width at a
// glow spread of 1 (so the fade-end ellipse lands under the outer handle).
import { useDropdown } from './Dropdown'
import EllipseCanvasEditor, { EllipseGeometry } from './EllipseCanvasEditor'
import useCanvasEditing, { setDial } from './canvasEditing'
import { readDial } from './dials'

/** Reads a numeric dial, falling back when it is unset or not a number. */
const num = (name: string, fallback: number) => {
  const value = parseFloat(readDial(name, String(fallback)))
  return Number.isFinite(value) ? value : fallback
}

/** The mask's dials, with useSurfaceMask's fallbacks. */
const readMaskDials = () => ({
  size: num('--sort-dropdown-mask-size', 226),
  aspect: num('--sort-dropdown-mask-aspect', 1.11),
  core: num('--sort-dropdown-mask-core', 44),
  falloff: num('--sort-dropdown-mask-falloff', 109),
  offsetX: num('--sort-dropdown-mask-offset-x', 0),
  offsetY: num('--sort-dropdown-mask-offset-y', 0),
  spread: num('--sort-dropdown-glow-spread', 2.2),
})

/** The mask ellipse's horizontal radius (px): useSurfaceMask's size × spread ÷ 2. */
const maskRadius = (dials: ReturnType<typeof readMaskDials>) => (dials.size * dials.spread) / 2

/** The mask as the editor sees it: the core and fade-end ellipses' horizontal radii in px. */
const readMask = (): EllipseGeometry => {
  const dials = readMaskDials()
  const rx = maskRadius(dials)
  return {
    offsetX: dials.offsetX,
    offsetY: dials.offsetY,
    inner: (rx * dials.core) / 100,
    outer: (rx * dials.falloff) / 100,
    aspect: dials.aspect,
  }
}

/** The mask's canvas editor, while the menu is open and the mask is being edited. */
const DropdownMaskEditor = ({ centre }: { centre: { x: number; y: number } }) => {
  const { isOpen } = useDropdown()
  const target = useCanvasEditing()
  if (target !== 'mask' || !isOpen) return null
  return (
    <EllipseCanvasEditor
      centre={centre}
      read={readMask}
      write={{
        offset: (x, y) => {
          setDial('--sort-dropdown-mask-offset-x', `${x}px`)
          setDial('--sort-dropdown-mask-offset-y', `${y}px`)
        },
        // The core is a % of the mask ellipse.
        inner: radius =>
          setDial('--sort-dropdown-mask-core', `${Math.round((radius / maskRadius(readMaskDials())) * 100)}%`),
        // Resize the ellipse so its fade end (falloff % of it) sits under the handle; the size dial is its width at a
        // spread of 1.
        outer: radius => {
          const dials = readMaskDials()
          const size = ((radius / (dials.falloff / 100)) * 2) / dials.spread
          setDial('--sort-dropdown-mask-size', `${Math.round(size)}px`)
        },
        aspect: aspect => setDial('--sort-dropdown-mask-aspect', String(aspect)),
      }}
      colours={{ inner: 'rgb(255, 120, 200)', outer: 'rgb(150, 245, 170)' }}
      labels={{ inner: 'Fully hidden core', outer: 'Where the content is fully visible again' }}
    />
  )
}

export default DropdownMaskEditor
