// PROTOTYPE — visual experiment only, not for merge.
//
// DropdownLight: the glow behind a Dropdown, from the em design file (Figma node 14593:170852).
// An even dim, then a tint, Figma's background-glow image, a band, a soft additive bloom and a
// selection glow. By default the light gathers around the options; a prototype toggle switches it
// to the whole surface for comparison. Also applies the surface mask (see useSurfaceMask).
//
// Every layer is its own fixed element portalled to <body>, so each blends with the whole page
// (a shared fixed wrapper would be a stacking context and isolate the blend modes).
import { CSSProperties, useState } from 'react'
import { createPortal } from 'react-dom'
import { css } from '../../../styled-system/css'
import { DROPDOWN_Z_INDEX, useDropdown } from './Dropdown'
import useSurfaceMask from './useSurfaceMask'

/** Where the light is laid out. 'menu': hugs the options. 'surface': the whole surface, bloom on the anchor. */
type LightScope = 'surface' | 'menu'
const SCOPE_KEY = 'glowMenuPrototype.lightScope'

/** Surface mask radius for each scope (px). Figma's mask ellipse is ~545×605 on a 384px-wide frame. */
const MASK_RADIUS: Record<LightScope, number> = { menu: 360, surface: 575 }

/** Figma Rectangle 752: transparent on the left to #434378 on the right. */
const SURFACE_TINT = 'linear-gradient(90deg, rgba(10, 10, 18, 0) 0%, rgba(67, 67, 120, 1) 100%)'

/** Reads the prototype's light-scope toggle; storage can be unavailable. */
const loadScope = (): LightScope => {
  try {
    return localStorage.getItem(SCOPE_KEY) === 'surface' ? 'surface' : 'menu'
  } catch {
    return 'menu'
  }
}

/** A fixed, non-interactive layer portalled to <body>. */
const Layer = ({ style }: { style: CSSProperties }) =>
  createPortal(
    <div style={{ position: 'fixed', pointerEvents: 'none', zIndex: DROPDOWN_Z_INDEX, ...style }} />,
    document.body,
  )

const DropdownLight = ({ surface }: { surface: HTMLElement | null }) => {
  const { isOpen, anchorRect, menuRect, timing, transition, lightMotion, stopPress } = useDropdown()
  const [scope, setScopeState] = useState<LightScope>(loadScope)
  useSurfaceMask(surface, MASK_RADIUS[scope])

  const setScope = (next: LightScope) => {
    setScopeState(next)
    try {
      localStorage.setItem(SCOPE_KEY, next)
    } catch {
      // ignore
    }
  }

  if (!anchorRect) return null

  const fade = (opacity: number): CSSProperties => ({
    opacity: isOpen ? opacity : 0,
    transition: transition(['opacity'], { dur: timing.light }),
  })

  const anchorX = anchorRect.left + anchorRect.width / 2
  const anchorY = anchorRect.top + anchorRect.height / 2
  const sr = surface?.getBoundingClientRect()

  // The box the light is laid out in: the options' bounds (padded), or the whole surface.
  const box =
    scope === 'menu'
      ? { left: menuRect.left - 60, top: menuRect.top - 40, width: menuRect.width + 100, height: menuRect.height + 80 }
      : (sr ?? { left: 0, top: 0, width: 0, height: 0 })
  // Bloom: on the options and sized to them, or on the anchor across most of the screen.
  const bloom =
    scope === 'menu'
      ? {
          x: menuRect.left + menuRect.width * 0.6,
          y: menuRect.top + menuRect.height / 2,
          w: menuRect.width + 280,
          h: menuRect.height + 260,
        }
      : { x: anchorX, y: anchorY, w: 1000, h: 1000 }
  const padded = { left: box.left - 120, top: box.top - 120, width: box.width + 240, height: box.height + 240 }

  return (
    <>
      {/* Even dim: a plain dark fill over the viewport (no backdrop filter, so it's cheap). Darkens inside and
          outside the surface alike, which flattens its edge, and keeps what's behind the glass from glaring. */}
      <Layer style={{ inset: 0, background: 'rgba(8, 8, 16, 0.55)', ...fade(1) }} />

      {/* Tint (Figma Rectangle 752): a free-floating ellipse that fades out before its own bounds. */}
      <Layer
        style={{
          ...padded,
          background: SURFACE_TINT,
          maskImage: 'radial-gradient(closest-side at 65% 35%, black 30%, transparent 100%)',
          ...fade(0.28),
        }}
      />

      {/* Background glow (Figma "Background glow" image, exported): a soft lavender field. Screen rather than
          Figma's colour dodge, which blew bright spots behind the glass up into a glaring patch. */}
      <Layer
        style={{
          ...padded,
          backgroundImage: 'url(/img/glow-menu/background-glow.png)',
          backgroundSize: '100% 100%',
          mixBlendMode: 'screen',
          maskImage: 'radial-gradient(closest-side at 60% 40%, black 35%, transparent 100%)',
          ...fade(0.22),
        }}
      />

      {/* Band (inside Figma's dodge frame): brightens toward the menu, feathered on every side. */}
      <Layer
        style={{
          left: box.left + box.width * 0.17,
          top: box.top,
          width: box.width * 0.83 + 40,
          height: box.height,
          background: SURFACE_TINT,
          maskImage:
            'linear-gradient(to right, transparent, black 45%, black 80%, transparent), linear-gradient(to bottom, transparent, black 35%, black 55%, transparent)',
          maskComposite: 'intersect',
          WebkitMaskComposite: 'source-in',
          mixBlendMode: 'screen',
          ...fade(0.5),
        }}
      />

      {/* Bloom (Figma "CC glow"): a soft lavender light, additive. */}
      <Layer
        style={{
          left: bloom.x - bloom.w / 2,
          top: bloom.y - bloom.h / 2,
          width: bloom.w,
          height: bloom.h,
          borderRadius: '50%',
          background:
            'radial-gradient(closest-side, rgba(120, 105, 225, 0.3) 0%, rgba(100, 88, 210, 0.17) 35%, rgba(70, 65, 170, 0.05) 70%, rgba(44, 44, 133, 0) 100%)',
          mixBlendMode: 'plus-lighter',
          ...lightMotion(0.3),
        }}
      />

      {/* Selection glow (Figma "Selection highlight"): a faint additive ellipse behind the selected row. */}
      <Layer
        style={{
          left: anchorRect.right + 43 - 286,
          top: anchorY - 35,
          width: 286,
          height: 70,
          background: 'radial-gradient(closest-side, rgba(170, 160, 255, 1), rgba(170, 160, 255, 0))',
          filter: 'blur(25px)',
          mixBlendMode: 'plus-lighter',
          ...fade(0.14),
        }}
      />

      {/* Prototype toggle: compare the light localised to the options against the light across the surface. */}
      {createPortal(
        <button
          onClick={e => {
            e.stopPropagation()
            setScope(scope === 'menu' ? 'surface' : 'menu')
          }}
          {...stopPress}
          className={css({
            position: 'fixed',
            left: '12px',
            bottom: 'calc(12px + env(safe-area-inset-bottom))',
            padding: '6px 10px',
            borderRadius: '8px',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            background: 'rgba(0, 0, 0, 0.7)',
            color: 'white',
            fontFamily: 'monospace',
            fontSize: '11px',
            cursor: 'pointer',
          })}
          style={{ zIndex: DROPDOWN_Z_INDEX, opacity: isOpen ? 1 : 0, pointerEvents: isOpen ? 'auto' : 'none' }}
        >
          Light: {scope === 'menu' ? 'around options' : 'across dialog'} (tap to switch)
        </button>,
        document.body,
      )}
    </>
  )
}

export default DropdownLight
