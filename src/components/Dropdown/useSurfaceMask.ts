// PROTOTYPE — visual experiment only, not for merge.
//
// useSurfaceMask: hides the surface a Dropdown belongs to under the dropdown's light, with an elliptical mask
// centred on the light (the original design's variable mask), on the Dropdown's clock. The content is hidden most
// at the light's centre and fades back to fully visible towards the ellipse's edge; any overall darkening comes from
// the light's screen dim, not from here. Masking the content is the only way it attenuates what the menu overlaps:
// the glass itself (fill, trapped highlights, stroke), its backdrop blur and the surface's own light (the Command
// Universe's room light, top light and selection glow) are never touched.
//
// Design dials: the mask's strength, size, aspect, core, falloff and offset read --sort-dropdown-* custom properties
// set by DropdownDebugPanel (the geometry through its canvas editor, DropdownMaskEditor), with the current design
// values as fallbacks. The mask's size also follows the glow's spread dial, so the mask grows and shrinks with the
// light.
//
// Interim: this reaches into the surface's DOM and sets styles on it, because the surface (the
// Command Universe dialog) sits outside the Dropdown's tree. The intended shape is for the surface's
// owner to read the Dropdown state and apply its own mask, as SidebarContent already does for the
// sidebar's dropdown.
import { useEffect } from 'react'
import { useDropdown } from './Dropdown'

// Registered so the mask's inner alpha can transition (a gradient itself cannot).
const MASK_PROPERTY_ID = 'dropdown-surface-mask-property'
const MASK_PROPERTY_CSS = `@property --dropdown-surface-mask { syntax: '<number>'; inherits: false; initial-value: 1; }`

/**
 * The mask's ellipse, as CSS lengths. Figma's mask ellipse is ~545×605 on a 384px-wide frame; the size dial is the
 * width at a glow spread of 1, (Figma's mask is ~545px at a spread of 1.9). Height is width × aspect.
 * Both are radii here (half the ellipse), which is what radial-gradient takes.
 */
const MASK_RADIUS_X = 'calc(var(--sort-dropdown-mask-size, 226px) * var(--sort-dropdown-glow-spread, 2.2) / 2)'
const MASK_RADIUS_Y =
  'calc(var(--sort-dropdown-mask-size, 226px) * var(--sort-dropdown-glow-spread, 2.2) * var(--sort-dropdown-mask-aspect, 1.11) / 2)'

/**
 * Applies the surface mask while the enclosing Dropdown is visible. The light is the centre of the dropdown's light
 * in viewport coordinates (px); the mask's ellipse sits there, nudged by the offset dials.
 */
const useSurfaceMask = (surface: HTMLElement | null, light: { x: number; y: number }) => {
  const { visible, isOpen, transition } = useDropdown()

  useEffect(() => {
    if (document.getElementById(MASK_PROPERTY_ID)) return
    const style = document.createElement('style')
    style.id = MASK_PROPERTY_ID
    style.textContent = MASK_PROPERTY_CSS
    document.head.appendChild(style)
  }, [])

  useEffect(() => {
    if (!surface || !visible) return
    // In-flow children (the header and the page): an elliptical mask centred on the light. Inside the core the
    // content shows at 1 − strength; from the core to the falloff end it fades back to fully visible. The core's
    // alpha transitions (it is a registered property), so the mask fades in and out with the light.
    ;[...surface.children].forEach(el => {
      if (!(el instanceof HTMLElement) || getComputedStyle(el).position === 'absolute') return
      const r = el.getBoundingClientRect()
      const x = `calc(${light.x - r.left}px + var(--sort-dropdown-mask-offset-x, 0px))`
      const y = `calc(${light.y - r.top}px + var(--sort-dropdown-mask-offset-y, 0px))`
      const mask = `radial-gradient(${MASK_RADIUS_X} ${MASK_RADIUS_Y} at ${x} ${y}, rgba(0, 0, 0, var(--dropdown-surface-mask)) var(--sort-dropdown-mask-core, 44%), black var(--sort-dropdown-mask-falloff, 109%))`
      el.style.maskImage = mask
      el.style.webkitMaskImage = mask
      el.style.transition = transition(['--dropdown-surface-mask'])
      el.style.setProperty('--dropdown-surface-mask', isOpen ? 'calc(1 - var(--sort-dropdown-mask-strength, 1))' : '1')
    })
  }, [surface, visible, isOpen, light.x, light.y])

  // Clear the mask once fully closed so the surface is untouched between uses.
  useEffect(() => {
    if (!surface || visible) return
    ;[...surface.children].forEach(el => {
      if (!(el instanceof HTMLElement)) return
      el.style.maskImage = ''
      el.style.webkitMaskImage = ''
      el.style.removeProperty('--dropdown-surface-mask')
    })
  }, [surface, visible])
}

export default useSurfaceMask
