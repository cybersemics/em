// PROTOTYPE — visual experiment only, not for merge.
//
// DropdownRadialBlur: a radial progressive blur behind a Dropdown's light and rows, over the surface it opens on.
// Strongest at the light's core and easing off outward, the radial analogue of ProgressiveBlur: a stack of fixed
// layers, each with its own backdrop-filter blur and an elliptical ring mask, so the blur steps down smoothly from
// the core blur at the centre to the edge blur at the outer ellipse. Off by default; a design-dials switch turns it on.
//
// DropdownRadialBlurEditor: the design-dials WYSIWYG editor for its extents. While editing is on and the menu is open,
// it draws the inner (fully blurred) and outer (edge blur) ellipses over the screen with handles: drag the centre to
// move it, the right-hand handles to resize either ellipse, and the top handle to change its aspect. Each drag writes
// the same custom properties as the panel's dials, through DIAL_SET_EVENT, so copying and syncing pick them up.
import { CSSProperties, PointerEvent as ReactPointerEvent, useRef } from 'react'
import { createPortal } from 'react-dom'
import { DROPDOWN_Z_INDEX, useDropdown } from './Dropdown'
import { readDial } from './dials'
import useBlurEditing, { DIAL_SET_EVENT } from './radialBlurEditing'
import { DIALS_ROOT_ATTRIBUTE } from './useMotionStepper'

/** Asks the panel to set one dial. */
const setDial = (name: string, value: string) =>
  window.dispatchEvent(new CustomEvent(DIAL_SET_EVENT, { detail: { name, value } }))

/** The blur's current geometry and strength, from the dials (with their defaults). */
const readBlur = () => {
  /** Reads a numeric dial, falling back when it is unset or not a number. */
  const num = (name: string, fallback: number) => {
    const value = parseFloat(readDial(name, String(fallback)))
    return Number.isFinite(value) ? value : fallback
  }
  return {
    enabled: readDial('--sort-dropdown-blur-enabled', 'off') === 'on',
    coreBlur: num('--sort-dropdown-blur-core', 16),
    edgeBlur: num('--sort-dropdown-blur-edge', 0),
    inner: num('--sort-dropdown-blur-inner', 120),
    outer: num('--sort-dropdown-blur-outer', 360),
    aspect: num('--sort-dropdown-blur-aspect', 1.1),
    offsetX: num('--sort-dropdown-blur-offset-x', 0),
    offsetY: num('--sort-dropdown-blur-offset-y', 0),
    layers: Math.round(Math.min(12, Math.max(1, num('--sort-dropdown-blur-layers', 5)))),
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

/** Stops a press on the editor from reaching document-level listeners, which would close the menu or the dialog. */
const stopPress = {
  onMouseDown: (event: React.SyntheticEvent) => event.stopPropagation(),
  onTouchStart: (event: React.SyntheticEvent) => event.stopPropagation(),
  onClick: (event: React.SyntheticEvent) => event.stopPropagation(),
}

/** Which part of the blur a handle edits. */
type HandleKind = 'centre' | 'inner' | 'outer' | 'aspect'

/** The canvas editor for the blur's extents, around the same centre as DropdownRadialBlur. */
export const DropdownRadialBlurEditor = ({ centre }: { centre: { x: number; y: number } }) => {
  const { isOpen } = useDropdown()
  const on = useBlurEditing()
  const drag = useRef<{
    kind: HandleKind
    startX: number
    startY: number
    blur: ReturnType<typeof readBlur>
    /** The side the resize handles were on when the drag began, so dragging outward always grows the ellipse. */
    side: number
    /** The side the shape handle was on, so dragging away from the centre always makes the ellipse taller. */
    vertical: number
  } | null>(null)
  if (!on || !isOpen) return null

  const blur = readBlur()
  const cx = centre.x + blur.offsetX
  const cy = centre.y + blur.offsetY
  const rx = Math.max(1, blur.outer)
  const ry = rx * blur.aspect
  // The resize handles sit on whichever side of the ellipse has room: the light is usually near the right edge, where
  // the outer handle would otherwise land off screen. +1: right of the centre; -1: left.
  const side = cx + rx + 24 > window.innerWidth ? -1 : 1
  // Likewise the shape handle: on top of the ellipse, or below it when the top is off screen. -1: top; +1: bottom.
  const vertical = cy - ry < 24 ? 1 : -1

  /** Starts dragging a handle. */
  const onPointerDown = (kind: HandleKind) => (event: ReactPointerEvent<HTMLDivElement>) => {
    event.stopPropagation()
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    drag.current = { kind, startX: event.clientX, startY: event.clientY, blur: readBlur(), side, vertical }
  }

  /** Writes the dragged handle's value. Each handle moves along the axis it sits on. */
  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const start = drag.current
    if (!start) return
    const dx = event.clientX - start.startX
    // Outward along the side the resize handles are on.
    const outward = dx * start.side
    const dy = event.clientY - start.startY
    /** Whole pixels, as a string. */
    const round = (value: number) => String(Math.round(value))
    if (start.kind === 'centre') {
      setDial('--sort-dropdown-blur-offset-x', `${round(start.blur.offsetX + dx)}px`)
      setDial('--sort-dropdown-blur-offset-y', `${round(start.blur.offsetY + dy)}px`)
    } else if (start.kind === 'outer') {
      setDial('--sort-dropdown-blur-outer', `${round(Math.max(start.blur.inner + 10, start.blur.outer + outward))}px`)
    } else if (start.kind === 'inner') {
      setDial(
        '--sort-dropdown-blur-inner',
        `${round(Math.min(start.blur.outer - 10, Math.max(0, start.blur.inner + outward)))}px`,
      )
    } else {
      // The shape handle sits on the outer ellipse's vertical radius; dragging away from the centre makes it taller.
      const height = Math.max(10, start.blur.outer * start.blur.aspect + dy * start.vertical)
      setDial('--sort-dropdown-blur-aspect', (height / start.blur.outer).toFixed(2))
    }
  }

  /** Ends the drag. */
  const onPointerUp = () => {
    drag.current = null
  }

  /** An ellipse outline, centred on the blur. */
  const outline = (radiusX: number, radiusY: number, colour: string): CSSProperties => ({
    position: 'fixed',
    left: cx - radiusX,
    top: cy - radiusY,
    width: radiusX * 2,
    height: radiusY * 2,
    borderRadius: '50%',
    border: `1.5px dashed ${colour}`,
    pointerEvents: 'none',
  })

  /** A round, touch-sized handle centred on a point. */
  const handle = (x: number, y: number, kind: HandleKind, label: string, colour: string) => (
    <div
      key={kind}
      role='slider'
      aria-label={label}
      title={label}
      onPointerDown={onPointerDown(kind)}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      {...stopPress}
      style={{
        position: 'fixed',
        left: x - 18,
        top: y - 18,
        width: 36,
        height: 36,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: kind === 'centre' ? 'move' : kind === 'aspect' ? 'ns-resize' : 'ew-resize',
        touchAction: 'none',
        pointerEvents: 'auto',
      }}
    >
      <div
        style={{
          width: 14,
          height: 14,
          borderRadius: '50%',
          background: colour,
          border: '2px solid rgba(0, 0, 0, 0.6)',
          boxShadow: '0 0 0 1px rgba(255, 255, 255, 0.5)',
        }}
      />
    </div>
  )

  const innerRy = blur.inner * blur.aspect
  return createPortal(
    <div
      {...{ [DIALS_ROOT_ATTRIBUTE]: '' }}
      style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: DROPDOWN_Z_INDEX + 1 }}
    >
      <div style={outline(blur.inner, innerRy, 'rgba(255, 170, 120, 0.9)')} />
      <div style={outline(rx, ry, 'rgba(140, 220, 255, 0.9)')} />
      {handle(cx, cy, 'centre', 'Blur centre: drag to move', 'white')}
      {handle(cx + side * blur.inner, cy, 'inner', 'Fully blurred core: drag to resize', 'rgb(255, 170, 120)')}
      {handle(cx + side * rx, cy, 'outer', 'Outer edge of the blur: drag to resize', 'rgb(140, 220, 255)')}
      {handle(
        cx,
        cy + vertical * ry,
        'aspect',
        'Blur shape: drag up or down to change its height',
        'rgb(140, 220, 255)',
      )}
    </div>,
    document.body,
  )
}

export default DropdownRadialBlur
