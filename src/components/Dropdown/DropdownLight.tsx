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
// Every layer is its own fixed element portalled to <body>, so each blends with the whole page
// (a shared fixed wrapper would be a stacking context and isolate the blend modes).
import { CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { DROPDOWN_Z_INDEX, useDropdown } from './Dropdown'
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

/** A fixed, non-interactive layer portalled to <body>. */
const Layer = ({ style }: { style: CSSProperties }) =>
  createPortal(
    <div style={{ position: 'fixed', pointerEvents: 'none', zIndex: DROPDOWN_Z_INDEX, ...style }} />,
    document.body,
  )

/**
 * The light on canvas, through the shared EllipseCanvasEditor: the centre handle moves its origin, the outer handle
 * sets the spread so the bloom's (scaled) outline sits under it, and the value handle sets the intensity.
 */
const DropdownLightEditor = ({
  origin,
  bloom,
}: {
  origin: { x: number; y: number }
  bloom: { w: number; h: number }
}) => {
  const { isOpen } = useDropdown()
  const target = useCanvasEditing()
  if (target !== 'light' || !isOpen) return null
  return (
    <EllipseCanvasEditor
      centre={origin}
      read={() => ({
        offsetX: num('--sort-dropdown-glow-offset-x', 0),
        offsetY: num('--sort-dropdown-glow-offset-y', 0),
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
        read: () => num('--sort-dropdown-glow-intensity', 1.2),
        write: value => setDial('--sort-dropdown-glow-intensity', String(value)),
        perPx: 0.01,
        min: 0,
        max: 2,
        digits: 2,
      }}
    />
  )
}

const DropdownLight = ({ surface }: { surface: HTMLElement | null }) => {
  const { isOpen, anchorRect, menuRect, selectedY, timing, transition, lightMotion } = useDropdown()
  // The light's origin offset, re-read on every render (the Dropdown re-renders its layers when a dial changes).
  const offsetX = num('--sort-dropdown-glow-offset-x', 0)
  const offsetY = num('--sort-dropdown-glow-offset-y', 0)
  // The light's centre before the offset: on the options, 60% across. The light editor works from here.
  const origin = { x: menuRect.left + menuRect.width * 0.6, y: menuRect.top + menuRect.height / 2 }
  // The light's centre, where the bloom, the surface mask and the radial blur sit.
  const lightCentre = { x: origin.x + offsetX, y: origin.y + offsetY }
  useSurfaceMask(surface, lightCentre)

  if (!anchorRect) return null

  /** Fades a light layer in to its design opacity, scaled by the intensity dial. */
  const fade = (opacity: number): CSSProperties => ({
    opacity: isOpen ? `calc(${opacity} * var(--sort-dropdown-glow-intensity, 1.2))` : 0,
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

  /**
   * Grows or shrinks a light layer by the spread dial, about the light's centre (the bloom's), so every layer
   * spreads together. Uses the scale property, which composes with the transform that lightMotion animates.
   */
  const spread = (left: number, top: number): CSSProperties => ({
    scale: 'var(--sort-dropdown-glow-spread, 2.2)',
    transformOrigin: `${bloom.x - left}px ${bloom.y - top}px`,
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
          opacity: isOpen ? 'var(--sort-dropdown-scrim-opacity, 0.65)' : 0,
          transition: transition(['opacity'], { dur: timing.light }),
        }}
      />

      {/* Tint (Figma Rectangle 752): a free-floating ellipse that fades out before its own bounds. */}
      <Layer
        style={{
          ...padded,
          background: SURFACE_TINT,
          maskImage: 'radial-gradient(closest-side at 65% 35%, black 30%, transparent 100%)',
          ...fade(0.28),
          ...spread(padded.left, padded.top),
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
          ...spread(padded.left, padded.top),
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
          // One elliptical falloff centred where the old ramps' full-strength core was (62.5% across, 45% down).
          // Two linear ramps multiplied together have rectangular contours, and their flat core was a lit rectangle:
          // that read as a rectangular cut-off rather than light. closest-side keeps the ellipse inside the layer, so
          // it reaches zero before any of its edges.
          maskImage:
            'radial-gradient(closest-side at 62.5% 45%, black 0%, rgba(0, 0, 0, 0.9) 20%, rgba(0, 0, 0, 0.62) 45%, rgba(0, 0, 0, 0.3) 70%, rgba(0, 0, 0, 0.08) 88%, transparent 100%)',
          mixBlendMode: 'screen',
          ...fade(0.5),
          ...spread(box.left + box.width * 0.17, box.top),
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
          ...fade(1),
          // fade() replaces lightMotion's transition; keep the grow-in as well.
          transition: transition(['opacity', 'transform'], { dur: timing.light }),
          ...spread(bloom.x - bloom.w / 2, bloom.y - bloom.h / 2),
        }}
      />

      {/* Selection glow (Figma "Selection highlight"): a faint additive ellipse behind the selected row. */}
      <Layer
        style={{
          left: anchorRect.right + 43 - 286,
          // Follows the selected row, which leaves the anchor when the menu drops down.
          top: selectedY - 35,
          width: 286,
          height: 70,
          background: 'radial-gradient(closest-side, rgba(170, 160, 255, 1), rgba(170, 160, 255, 0))',
          filter: 'blur(25px)',
          mixBlendMode: 'plus-lighter',
          ...fade(0.14),
        }}
      />

      {/* The canvas editors, shown while editing the light, the mask or the blur from the dials panel. */}
      <DropdownLightEditor origin={origin} bloom={bloom} />
      <DropdownMaskEditor centre={lightCentre} />
      <DropdownRadialBlurEditor centre={lightCentre} />
    </>
  )
}

export default DropdownLight
