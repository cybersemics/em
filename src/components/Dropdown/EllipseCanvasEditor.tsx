// PROTOTYPE — visual experiment only, not for merge.
//
// EllipseCanvasEditor: the design-dials WYSIWYG editor for an ellipse centred on the dropdown's light (the light
// itself, the radial blur and the mask all use it). It draws an inner and an outer ellipse over the screen with handles: drag the
// centre to move it, the side handles to resize either ellipse, and the vertical handle to change its shape. An
// optional value handle sets a number by dragging up or down, showing it while dragging (the light's intensity). The
// owner maps the geometry to its dials: read() gives the current geometry, and each drag calls write with the new
// value, which the owner turns into dials set through the panel (so copying and syncing pick them up).
import { CSSProperties, PointerEvent as ReactPointerEvent, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { DROPDOWN_LAYER_Z } from './Dropdown'
import { DIALS_ROOT_ATTRIBUTE } from './useMotionStepper'

/** An ellipse pair as the editor sees it: horizontal radii in px, height = width × aspect, offset from the centre. */
export interface EllipseGeometry {
  offsetX: number
  offsetY: number
  /** Horizontal radius of the inner ellipse (px). */
  inner: number
  /** Horizontal radius of the outer ellipse (px). */
  outer: number
  /** Height ÷ width, shared by both ellipses. */
  aspect: number
}

/** How each handle's new value is written back to the owner's dials. */
export interface EllipseWriters {
  offset: (x: number, y: number) => void
  /** Omit to hide the inner ellipse and its handle. */
  inner?: (radius: number) => void
  outer: (radius: number) => void
  /** Omit to hide the shape handle (the aspect is then fixed by the owner). */
  aspect?: (aspect: number) => void
}

/** A number set by dragging a handle up (more) or down (less), shown beside it while dragging. */
export interface ValueHandle {
  label: string
  read: () => number
  write: (value: number) => void
  /** How much the value changes per pixel dragged. */
  perPx: number
  min: number
  max: number
  /** Decimal places to round to and show. */
  digits: number
}

/** Which part of the ellipse a handle edits. */
type HandleKind = 'centre' | 'inner' | 'outer' | 'aspect' | 'value'

/** Keeps handles this far inside the viewport's edges (px), so they can be grabbed. */
const MARGIN = 28

/**
 * Directions to try, in order, for a resize handle on an ellipse: the sides first, then the diagonals, then top and
 * bottom. Angles in radians, measured with y pointing down.
 */
const HANDLE_ANGLES = [
  0,
  Math.PI,
  Math.PI / 4,
  (3 * Math.PI) / 4,
  -Math.PI / 4,
  (-3 * Math.PI) / 4,
  Math.PI / 2,
  -Math.PI / 2,
]

/**
 * Where to put a resize handle for an ellipse of horizontal radius r: the first point on its outline that is on screen,
 * trying HANDLE_ANGLES in order. When the whole outline is off screen (an ellipse bigger than the viewport, like a
 * widely spread light on a phone), the handle sits where the line from the centre towards the viewport's middle
 * leaves the screen, so it can still be reached. Also returns the direction a drag is measured along: the outline
 * point's direction (cos θ, aspect × sin θ), and its length, so a drag along it maps back to a change in r.
 */
const placeHandle = (cx: number, cy: number, r: number, aspect: number) => {
  /** Whether a point is inside the viewport, clear of its edges. */
  const inside = (x: number, y: number) =>
    x >= MARGIN && x <= window.innerWidth - MARGIN && y >= MARGIN && y <= window.innerHeight - MARGIN
  /** A handle at an angle on the outline. */
  const at = (theta: number) => {
    const dx = Math.cos(theta)
    const dy = aspect * Math.sin(theta)
    const length = Math.hypot(dx, dy) || 1
    return { x: cx + r * dx, y: cy + r * dy, ux: dx / length, uy: dy / length, length }
  }
  for (const theta of HANDLE_ANGLES) {
    const point = at(theta)
    if (inside(point.x, point.y)) return point
  }
  // Nothing on screen: aim at the viewport's middle and stop at its edge.
  const theta = Math.atan2((window.innerHeight / 2 - cy) / Math.max(0.01, aspect), window.innerWidth / 2 - cx)
  const point = at(theta)
  return {
    ...point,
    x: Math.min(window.innerWidth - MARGIN, Math.max(MARGIN, point.x)),
    y: Math.min(window.innerHeight - MARGIN, Math.max(MARGIN, point.y)),
  }
}

/** Stops a press on the editor from reaching document-level listeners, which would close the menu or the dialog. */
const stopPress = {
  onMouseDown: (event: React.SyntheticEvent) => event.stopPropagation(),
  onTouchStart: (event: React.SyntheticEvent) => event.stopPropagation(),
  onClick: (event: React.SyntheticEvent) => event.stopPropagation(),
}

/** The canvas editor for one ellipse pair around a centre (the light's centre, in viewport coordinates). */
const EllipseCanvasEditor = ({
  centre,
  read,
  write,
  colours,
  labels,
  valueHandle,
}: {
  centre: { x: number; y: number }
  read: () => EllipseGeometry
  write: EllipseWriters
  colours: { inner: string; outer: string }
  /** What the inner and outer ellipses mean, for the handles' labels. */
  labels: { inner: string; outer: string }
  valueHandle?: ValueHandle
}) => {
  // The value handle's number while it is being dragged, shown beside it; null when not dragging it.
  const [dragValue, setDragValue] = useState<number | null>(null)
  const drag = useRef<{
    kind: HandleKind
    startX: number
    startY: number
    geometry: EllipseGeometry
    /** The value handle's number when the drag began. */
    value: number
    /**
     * The direction the dragged resize handle sits in from the centre (a unit vector), and how far along it the
     * outline is per pixel of horizontal radius, so dragging outward always grows the ellipse, wherever the handle is.
     */
    direction: { ux: number; uy: number; length: number }
    /** The side the shape handle was on, so dragging away from the centre always makes the ellipse taller. */
    vertical: number
  } | null>(null)

  const geometry = read()
  const cx = centre.x + geometry.offsetX
  const cy = centre.y + geometry.offsetY
  const rx = Math.max(1, geometry.outer)
  const ry = rx * geometry.aspect
  // The resize handles sit on the first part of each outline that is on screen (see placeHandle): the light is
  // usually near the right edge, and spread wide it can be bigger than a phone's screen.
  const innerRx = Math.max(0, geometry.inner)
  const outerHandle = placeHandle(cx, cy, rx, geometry.aspect)
  const innerHandle = placeHandle(cx, cy, Math.max(1, innerRx), geometry.aspect)
  // Likewise the shape handle: on top of the ellipse, or below it when the top is off screen. -1: top; +1: bottom.
  const vertical = cy - ry < 24 ? 1 : -1

  /** Starts dragging a handle. */
  const onPointerDown = (kind: HandleKind) => (event: ReactPointerEvent<HTMLDivElement>) => {
    event.stopPropagation()
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    const value = valueHandle?.read() ?? 0
    const handle = kind === 'inner' ? innerHandle : outerHandle
    drag.current = {
      kind,
      startX: event.clientX,
      startY: event.clientY,
      geometry: read(),
      value,
      direction: { ux: handle.ux, uy: handle.uy, length: handle.length },
      vertical,
    }
    if (kind === 'value') setDragValue(value)
  }

  /** Writes the dragged handle's value. Each handle moves along the axis it sits on. */
  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const start = drag.current
    if (!start) return
    const dx = event.clientX - start.startX
    const dy = event.clientY - start.startY
    const g = start.geometry
    // Outward along the direction the handle sits in, converted to horizontal radius.
    const outward = (dx * start.direction.ux + dy * start.direction.uy) / start.direction.length
    if (start.kind === 'centre') write.offset(Math.round(g.offsetX + dx), Math.round(g.offsetY + dy))
    else if (start.kind === 'outer') write.outer(Math.round(Math.max(g.inner + 10, g.outer + outward)))
    else if (start.kind === 'inner') write.inner?.(Math.round(Math.min(g.outer - 10, Math.max(0, g.inner + outward))))
    else if (start.kind === 'value' && valueHandle) {
      // Up is more.
      const next = Math.min(valueHandle.max, Math.max(valueHandle.min, start.value - dy * valueHandle.perPx))
      const rounded = Number(next.toFixed(valueHandle.digits))
      valueHandle.write(rounded)
      setDragValue(rounded)
    } else {
      // The shape handle sits on the outer ellipse's vertical radius; dragging away from the centre makes it taller.
      const height = Math.max(10, g.outer * g.aspect + dy * start.vertical)
      write.aspect?.(Number((height / Math.max(1, g.outer)).toFixed(2)))
    }
  }

  /** Ends the drag. */
  const onPointerUp = () => {
    drag.current = null
    setDragValue(null)
  }

  /** An ellipse outline, centred on the editor's centre. */
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
        cursor: kind === 'centre' ? 'move' : kind === 'aspect' || kind === 'value' ? 'ns-resize' : 'ew-resize',
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

  // The value handle sits a little above the centre (below it when there's no room), clear of the centre handle.
  const valueY = cy - 56 < 24 ? cy + 56 : cy - 56
  return createPortal(
    <div
      {...{ [DIALS_ROOT_ATTRIBUTE]: '' }}
      style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: DROPDOWN_LAYER_Z.editor }}
    >
      {write.inner ? <div style={outline(innerRx, innerRx * geometry.aspect, colours.inner)} /> : null}
      <div style={outline(rx, ry, colours.outer)} />
      {handle(cx, cy, 'centre', 'Centre: drag to move', 'white')}
      {write.inner
        ? handle(innerHandle.x, innerHandle.y, 'inner', `${labels.inner}: drag to resize`, colours.inner)
        : null}
      {handle(outerHandle.x, outerHandle.y, 'outer', `${labels.outer}: drag to resize`, colours.outer)}
      {write.aspect
        ? handle(cx, cy + vertical * ry, 'aspect', 'Shape: drag up or down to change its height', colours.outer)
        : null}
      {valueHandle ? handle(cx, valueY, 'value', `${valueHandle.label}: drag up or down`, colours.inner) : null}
      {valueHandle && dragValue !== null ? (
        <div
          style={{
            position: 'fixed',
            left: cx + 24,
            top: valueY - 11,
            padding: '2px 6px',
            borderRadius: 4,
            background: 'rgba(0, 0, 0, 0.75)',
            color: 'white',
            fontFamily: 'monospace',
            fontSize: 12,
            pointerEvents: 'none',
          }}
        >
          {valueHandle.label} {dragValue.toFixed(valueHandle.digits)}
        </div>
      ) : null}
    </div>,
    document.body,
  )
}

export default EllipseCanvasEditor
