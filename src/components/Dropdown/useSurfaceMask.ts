// PROTOTYPE — visual experiment only, not for merge.
//
// useSurfaceMask: dims the surface a Dropdown belongs to and clears a radial space under the menu,
// on the Dropdown's clock. Dimming the content and masking it are the only ways it attenuates what the menu
// overlaps: the glass itself (fill, trapped highlights, stroke) is never touched. Beside the sheet, two optional
// dials can also reach the backdrop blur and the surface's own light (the Command Universe's room light, top light
// and selection glow); both default to leaving them as they are.
//
// Design dials: the dimming, the cleared space, the blur and the room light read --sort-dropdown-* custom
// properties set by DropdownDebugPanel, with the current design values as fallbacks.
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
 * Applies the surface mask while the enclosing Dropdown is visible. The radius is the default reach of the cleared
 * space (px), used when the clear-radius dial is unset.
 */
const useSurfaceMask = (surface: HTMLElement | null, radius: number) => {
  const { visible, isOpen, menuRect, transition } = useDropdown()

  useEffect(() => {
    if (document.getElementById(MASK_PROPERTY_ID)) return
    const style = document.createElement('style')
    style.id = MASK_PROPERTY_ID
    style.textContent = MASK_PROPERTY_CSS
    document.head.appendChild(style)
  }, [])

  useEffect(() => {
    if (!surface || !visible) return
    const centreX = menuRect.left + menuRect.width / 2
    const centreY = menuRect.top + menuRect.height / 2
    const isAbsolute = (el: Element): el is HTMLElement =>
      el instanceof HTMLElement && getComputedStyle(el).position === 'absolute'

    // In-flow children (the header and the page): dim, and clear a radial space under the menu. The cleared
    // space's inner alpha is how much of the surface still shows there (0 clears it completely).
    ;[...surface.children].forEach(el => {
      if (!(el instanceof HTMLElement) || getComputedStyle(el).position === 'absolute') return
      const r = el.getBoundingClientRect()
      const mask = `radial-gradient(circle var(--sort-dropdown-clear-radius, ${radius}px) at ${centreX - r.left}px ${centreY - r.top}px, rgba(0, 0, 0, var(--dropdown-surface-mask)) 9%, black 100%)`
      el.style.maskImage = mask
      el.style.webkitMaskImage = mask
      el.style.transition = transition(['opacity', '--dropdown-surface-mask'])
      el.style.opacity = isOpen ? 'var(--sort-dropdown-content-opacity, 1)' : '1'
      el.style.setProperty('--dropdown-surface-mask', isOpen ? 'var(--sort-dropdown-clear-strength, 1)' : '1')
    })

    // Beside the sheet: the backdrop blur, and the surface's own light.
    ;[...(surface.parentElement?.children ?? [])]
      .filter(el => el !== surface)
      .filter(isAbsolute)
      .forEach(el => {
        const isBlur = getComputedStyle(el).backdropFilter !== 'none'
        el.style.transition = transition(['opacity'])
        el.style.opacity = !isOpen
          ? ''
          : isBlur
            ? 'var(--sort-dropdown-glass-blur, 1)'
            : 'var(--sort-dropdown-room-light, 1)'
      })
  }, [surface, visible, isOpen, menuRect.left, menuRect.top, menuRect.width, menuRect.height, radius])

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
