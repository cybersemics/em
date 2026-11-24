import { CSSProperties, PointerEvent as ReactPointerEvent, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useSelector } from 'react-redux'
import useBreakpoint from '../../hooks/useBreakpoint'
import storage from '../../util/storage'

/*
 * TEMPORARY. A dev-only panel for dialing in how the desktop Command Universe glass sits over the thoughtspace. Every
 * control writes a custom property on <html> that dialogRecipe, Dialog or CommandUniverseListItem reads with the shipped value as its fallback,
 * so clearing a field restores the shipped look. Once the values are settled, bake them into those fallbacks and delete
 * this file, its mount in AppComponent, and its sync plugin (src/vite-middleware/commandUniverseGlassDialsSync.ts, its
 * vite.config entry, and commandUniverseGlassDials.json). Mounted in development builds only, never in automated runs,
 * and hidden unless the address has ?dials.
 *
 * On the dev server every change is shared with every other connected browser and kept on disk by the sync plugin.
 * The panel can also pop out into its own window, which keeps driving this one.
 */

interface Control {
  /** The custom property this control writes. */
  name: string
  label: string
  min: number
  max: number
  step: number
  unit: string
  /** The shipped value, without its unit. */
  fallback: number
  hint?: string
  /** Makes the control an on/off switch. While on, this CSS is injected into the page. */
  css?: string
  /** Makes the control a colour picker; this is its shipped colour, as hex. */
  color?: string
  /** Makes the control the scrim's gradient-stop editor. */
  gradient?: boolean
}

interface Section {
  title: string
  controls: Control[]
}

const SECTIONS: Section[] = [
  {
    title: 'Glass blur',
    controls: [{ name: '--cu-glass-blur', label: 'blur', min: 0, max: 80, step: 1, unit: 'px', fallback: 6 }],
  },
  {
    title: 'Glass backdrop tone',
    controls: [
      { name: '--cu-glass-saturate', label: 'saturate', min: 0, max: 2, step: 0.01, unit: '', fallback: 1 },
      { name: '--cu-glass-brightness', label: 'brightness', min: 0, max: 2, step: 0.01, unit: '', fallback: 1 },
      { name: '--cu-glass-contrast', label: 'contrast', min: 0, max: 2, step: 0.01, unit: '', fallback: 1 },
    ],
  },
  {
    title: 'Glass fill',
    controls: [
      { name: '--cu-glass-fill-opacity', label: 'fill opacity', min: 0, max: 1, step: 0.01, unit: '', fallback: 1 },
      {
        name: '--cu-glass-fill-floor',
        label: 'fill floor',
        min: 0,
        max: 1,
        step: 0.01,
        unit: '',
        fallback: 0,
        hint: 'Least the fill fades to, under the light falloff',
      },
    ],
  },
  {
    title: 'Border',
    controls: [
      { name: '--cu-border-width', label: 'width', min: 0, max: 4, step: 0.5, unit: 'px', fallback: 1 },
      { name: '--cu-border-opacity', label: 'opacity', min: 0, max: 1, step: 0.01, unit: '', fallback: 1 },
      ...[
        { name: '--cu-border-top', label: 'colour at top', color: '#7f8baf' },
        { name: '--cu-border-bottom', label: 'colour at bottom', color: '#f0f0f0' },
      ].map(control => ({ ...control, min: 0, max: 0, step: 0, unit: '', fallback: 0 })),
      {
        name: '--cu-border-reach',
        label: 'fade reach',
        min: 0.3,
        max: 3,
        step: 0.05,
        unit: '',
        fallback: 1,
        hint: 'How far down the border stays lit before it fades out (1 = with the glass light)',
      },
      {
        name: '--cu-border-floor',
        label: 'fade floor',
        min: 0,
        max: 1,
        step: 0.01,
        unit: '',
        fallback: 0,
        hint: 'The least the border fades to at the bottom, so it never disappears completely',
      },
    ],
  },
  {
    title: 'App scrim',
    controls: [
      {
        name: '--cu-scrim-stops',
        label: 'gradient',
        min: 0,
        max: 0,
        step: 0,
        unit: '',
        fallback: 0,
        gradient: true,
        hint: 'Colour stops from the centre of the scrim (left) to its edge (right).',
      },
      {
        name: '--cu-scrim-rx',
        label: 'falloff width ×glass',
        min: 0.2,
        max: 4,
        step: 0.01,
        unit: '',
        fallback: 1.55,
        hint: 'Horizontal radius of the falloff, as a multiple of the glass width',
      },
      {
        name: '--cu-scrim-ry',
        label: 'falloff height ×glass',
        min: 0.2,
        max: 4,
        step: 0.01,
        unit: '',
        fallback: 1.71,
        hint: 'Vertical radius of the falloff, as a multiple of the glass height',
      },
      {
        name: '--cu-scrim-cy',
        label: 'centre y ×glass',
        min: -0.5,
        max: 2.5,
        step: 0.01,
        unit: '',
        fallback: 0.5,
        hint: 'Centre of the falloff, down from the top of the glass, in glass heights (1 = its bottom edge)',
      },
      {
        name: '--cu-scrim-cx',
        label: 'centre x ×glass',
        min: -1.5,
        max: 1.5,
        step: 0.01,
        unit: '',
        fallback: 0,
        hint: 'Centre of the falloff, across from the centre of the glass, in glass widths',
      },
      {
        name: '--cu-scrim-handles',
        label: 'show handles on the page',
        min: 0,
        max: 1,
        step: 1,
        unit: '',
        fallback: 0,
        hint: 'Drag the centre and the width and height of the falloff directly on the page',
        css: '',
      },
    ],
  },
  {
    title: 'Grain (Safari banding)',
    controls: [
      {
        name: '--cu-grain',
        label: 'grain over the page',
        min: 0,
        max: 1,
        step: 1,
        unit: '',
        fallback: 0,
        hint: 'High-contrast noise in soft-light blend over everything, to break up the gradient banding Safari shows (Chrome dithers gradients; Safari does not). Soft-light leaves black untouched, so it does not lift the blacks.',
        css: `body::after { content: ""; position: fixed; inset: 0; z-index: 2147483647; pointer-events: none; background-image: url("data:image/svg+xml,%3Csvg%20xmlns%3D%27http%3A//www.w3.org/2000/svg%27%20width%3D%27200%27%20height%3D%27200%27%3E%3Cfilter%20id%3D%27n%27%3E%3CfeTurbulence%20type%3D%27fractalNoise%27%20baseFrequency%3D%271.2%27%20numOctaves%3D%271%27%20stitchTiles%3D%27stitch%27/%3E%3CfeColorMatrix%20type%3D%27saturate%27%20values%3D%270%27/%3E%3CfeComponentTransfer%3E%3CfeFuncR%20type%3D%27linear%27%20slope%3D%275%27%20intercept%3D%27-2%27/%3E%3CfeFuncG%20type%3D%27linear%27%20slope%3D%275%27%20intercept%3D%27-2%27/%3E%3CfeFuncB%20type%3D%27linear%27%20slope%3D%275%27%20intercept%3D%27-2%27/%3E%3CfeFuncA%20type%3D%27linear%27%20slope%3D%270%27%20intercept%3D%271%27/%3E%3C/feComponentTransfer%3E%3C/filter%3E%3Crect%20width%3D%27100%25%27%20height%3D%27100%25%27%20filter%3D%27url%28%23n%29%27/%3E%3C/svg%3E"); background-size: 200px 200px; opacity: var(--cu-grain-strength, 0.2); mix-blend-mode: soft-light; }`,
      },
      {
        name: '--cu-grain-strength',
        label: 'strength',
        min: 0,
        max: 0.6,
        step: 0.01,
        unit: '',
        fallback: 0.2,
        hint: 'Opacity of the grain. Around 0.2 broke up the rings in testing without visible texture at normal contrast.',
      },
    ],
  },
  {
    title: 'Blur fade',
    controls: [
      {
        name: '--cu-blur-fade-share',
        label: 'blur reaches full at ×fade',
        min: 0.05,
        max: 1,
        step: 0.05,
        unit: '',
        fallback: 1,
        hint: 'How far into the panel fade the blurs reach full opacity (1 = with the panel). Applies on the next open.',
      },
    ],
  },
  {
    title: 'Inactive commands',
    controls: [
      {
        name: '--cu-inactive-text-opacity',
        label: 'title + description',
        min: 0,
        max: 1,
        step: 0.01,
        unit: '',
        fallback: 0.5,
        hint: 'Opacity of the title and description of a list row whose command cannot run right now (1 = as bright as an active row).',
      },
      {
        name: '--cu-inactive-icon-opacity',
        label: 'icon',
        min: 0,
        max: 1,
        step: 0.01,
        unit: '',
        fallback: 0.35,
        hint: 'Opacity of the icon of an inactive list row.',
      },
      {
        name: '--cu-inactive-shortcut-opacity',
        label: 'shortcut',
        min: 0,
        max: 1,
        step: 0.01,
        unit: '',
        fallback: 0.25,
        hint: 'Opacity of the keyboard shortcut of an inactive list row while it is not highlighted (an active row shows it at 0.5).',
      },
    ],
  },
  {
    title: 'Debug: find the animation glitch',
    controls: [
      {
        name: '--cu-debug-no-glass-blur',
        label: 'hide glass blur',
        hint: 'Removes the blur layer under the glass',
        css: '[class*="dialog__glassBackdropBlur"] { display: none !important; }',
      },
      {
        name: '--cu-debug-no-blur-fade',
        label: "don't fade the glass blur",
        hint: 'The glass blur appears and disappears at full opacity instead of fading',
        css: '[class*="dialog__glassBackdropBlur"] { opacity: 1 !important; }',
      },
    ].map(control => ({ ...control, min: 0, max: 1, step: 1, unit: '', fallback: 0 })),
  },
]

const STORAGE_KEY = 'cuGlassDebugPanel'

type Overrides = Record<string, number | string>

/** Reads persisted overrides. Storage may be unavailable, in which case the panel starts empty. */
const loadOverrides = (): Overrides => {
  try {
    return JSON.parse(storage.getItem(STORAGE_KEY) ?? '{}') as Overrides
  } catch {
    return {}
  }
}

/** Finds the control for a custom property. */
const controlFor = (name: string) => SECTIONS.flatMap(section => section.controls).find(c => c.name === name)

/** One device's change: a value set, or cleared with null. Mirrors DialChange in commandUniverseGlassDialsSync. */
interface DialChange {
  from: string
  changes: Record<string, number | string | null>
}

/** Identifies this tab, so it can ignore its own changes when the dev server echoes them back. */
const clientId = Math.random().toString(36).slice(2, 10)

/** Applies a change to a copy of the overrides. */
const applyChanges = (overrides: Overrides, changes: DialChange['changes']): Overrides => {
  const next = { ...overrides }
  Object.entries(changes).forEach(([name, value]) => {
    if (value === null) delete next[name]
    else next[name] = value
  })
  return next
}

/** The time now, for the sync status. */
const now = () => new Date().toLocaleTimeString()

const textStyle: CSSProperties = {
  color: 'white',
  font: '11px/1.35 ui-monospace, Menlo, monospace',
}

const panelStyle: CSSProperties = {
  ...textStyle,
  position: 'fixed',
  top: 12,
  right: 12,
  zIndex: 100000,
  width: 250,
  maxHeight: 'calc(100vh - 24px)',
  overflowY: 'auto',
  padding: 10,
  borderRadius: 10,
  background: 'rgba(16, 16, 20, 0.92)',
  border: '1px solid rgba(255, 255, 255, 0.15)',
  boxShadow: '0 8px 30px rgba(0, 0, 0, 0.5)',
}

const buttonStyle: CSSProperties = {
  font: 'inherit',
  color: 'inherit',
  background: 'rgba(255, 255, 255, 0.08)',
  border: '1px solid rgba(255, 255, 255, 0.2)',
  borderRadius: 5,
  padding: '2px 6px',
  cursor: 'pointer',
}

/** The scrim's current value for a dial: its override, or its shipped value. */
const scrimValue = (overrides: Overrides, name: string) => {
  const value = overrides[name]
  return value === undefined ? (controlFor(name)?.fallback ?? 0) : Number(value)
}

/** How close to the window's edge an off-screen handle is pinned, in px. */
const EDGE = 16

/** Rounds a dial value to two decimals, as the sliders do. */
const round = (value: number) => Math.round(value * 100) / 100

/**
 * Draggable handles over the page for the scrim's centre and its horizontal and vertical radii, with the falloff's
 * outline drawn as a dashed ellipse. Reads the glass's box from the custom
 * properties CommandUniverseGlassBackdrop publishes, and writes the same dials as the sliders.
 */
const ScrimHandles = ({ overrides, set }: { overrides: Overrides; set: (name: string, value: number) => void }) => {
  const [, setTick] = useState(0)
  useEffect(() => {
    /** Redraws the handles when the window, and so the glass, resizes. */
    const onResize = () => setTick(tick => tick + 1)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const style = getComputedStyle(document.documentElement)
  const glass = {
    top: parseFloat(style.getPropertyValue('--cu-glass-top')),
    width: parseFloat(style.getPropertyValue('--cu-glass-width')),
    height: parseFloat(style.getPropertyValue('--cu-glass-height')),
    centreX: parseFloat(style.getPropertyValue('--cu-glass-centre-x')),
  }
  if (Object.values(glass).some(Number.isNaN)) return null

  const cx = glass.centreX + glass.width * scrimValue(overrides, '--cu-scrim-cx')
  const cy = glass.top + glass.height * scrimValue(overrides, '--cu-scrim-cy')
  const rx = glass.width * scrimValue(overrides, '--cu-scrim-rx')
  const ry = glass.height * scrimValue(overrides, '--cu-scrim-ry')

  /** Starts a drag that maps the pointer's position to dial values until the pointer is released. */
  const drag = (onMove: (x: number, y: number) => void) => (e: ReactPointerEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    const target = e.currentTarget
    target.setPointerCapture(e.pointerId)
    /** Applies the pointer's position. */
    const move = (event: PointerEvent) => onMove(event.clientX, event.clientY)
    /** Ends the drag. */
    const up = () => {
      target.removeEventListener('pointermove', move)
      target.removeEventListener('pointerup', up)
    }
    target.addEventListener('pointermove', move)
    target.addEventListener('pointerup', up)
  }

  const handles = [
    {
      key: 'centre',
      label: 'centre',
      x: cx,
      y: cy,
      onMove: (x: number, y: number) => {
        set('--cu-scrim-cx', round((x - glass.centreX) / glass.width))
        set('--cu-scrim-cy', round((y - glass.top) / glass.height))
      },
    },
    {
      key: 'width',
      label: 'width',
      x: cx + rx,
      y: cy,
      onMove: (x: number) => set('--cu-scrim-rx', round(Math.max(0.05, (x - cx) / glass.width))),
    },
    {
      key: 'height',
      label: 'height',
      x: cx,
      y: cy - ry,
      onMove: (_x: number, y: number) => set('--cu-scrim-ry', round(Math.max(0.05, (cy - y) / glass.height))),
    },
  ].map(handle => {
    // Pinned inside the window when the scrim reaches past it. Dragging from a pinned handle still sets the value
    // from where the pointer is.
    const x = Math.min(window.innerWidth - EDGE, Math.max(EDGE, handle.x))
    const y = Math.min(window.innerHeight - EDGE, Math.max(EDGE, handle.y))
    const offscreen = x !== handle.x || y !== handle.y
    const arrow = handle.y < y ? ' ↑' : handle.y > y ? ' ↓' : handle.x > x ? ' →' : handle.x < x ? ' ←' : ''
    return { ...handle, x, y, label: offscreen ? `${handle.label}${arrow} (off-screen)` : handle.label }
  })

  return (
    <div data-above-dialog style={{ position: 'fixed', inset: 0, zIndex: 100001, pointerEvents: 'none' }}>
      <svg width='100%' height='100%' style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
        <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill='none' stroke='rgb(120, 200, 255)' strokeDasharray='6 6' />
      </svg>
      {handles.map(handle => (
        <div
          key={handle.key}
          title={`Drag to set the scrim's ${handle.label}`}
          onPointerDown={drag(handle.onMove)}
          style={{
            position: 'absolute',
            left: handle.x - 8,
            top: handle.y - 8,
            width: 16,
            height: 16,
            borderRadius: 8,
            background: 'rgb(120, 200, 255)',
            border: '2px solid white',
            boxShadow: '0 0 6px rgba(0, 0, 0, 0.6)',
            cursor: 'grab',
            pointerEvents: 'auto',
            touchAction: 'none',
          }}
        >
          <span
            style={{
              ...textStyle,
              position: 'absolute',
              left: 20,
              top: -2,
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
            }}
          >
            {handle.label}
          </span>
        </div>
      ))}
    </div>
  )
}

/** The shipped scrim stops. Mirrors the --cu-scrim-stops fallback in dialogRecipe's appScrim. */
const SCRIM_STOPS =
  'rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0.9) 33.49%, rgba(0, 0, 0, 0.8) 61.1%, rgba(0, 0, 0, 0.39) 83.82%'

/** One stop of the scrim gradient: a colour, its opacity, and its position from the centre (0) to the edge (100). */
interface Stop {
  color: string
  alpha: number
  position: number
}

/** Serialises stops as CSS colour stops, sorted by position. */
const formatStops = (stops: Stop[]) =>
  [...stops]
    .sort((a, b) => a.position - b.position)
    .map(({ color, alpha, position }) => {
      const [r, g, b] = [1, 3, 5].map(i => parseInt(color.slice(i, i + 2), 16))
      return `rgba(${r}, ${g}, ${b}, ${round(alpha)}) ${round(position)}%`
    })
    .join(', ')

/** Parses stops written by formatStops. */
const parseStops = (value: string): Stop[] =>
  [...value.matchAll(/rgba\((\d+), (\d+), (\d+), ([\d.]+)\) ([\d.]+)%/g)].map(([, r, g, b, alpha, position]) => ({
    color: `#${[r, g, b].map(n => Number(n).toString(16).padStart(2, '0')).join('')}`,
    alpha: Number(alpha),
    position: Number(position),
  }))

/** The colour and opacity of the gradient at a position, interpolated between the stops around it. */
const sampleStops = (stops: Stop[], position: number): Omit<Stop, 'position'> => {
  const sorted = [...stops].sort((a, b) => a.position - b.position)
  const after = sorted.find(stop => stop.position >= position) ?? sorted[sorted.length - 1]
  const before = [...sorted].reverse().find(stop => stop.position <= position) ?? sorted[0]
  const t = after.position === before.position ? 0 : (position - before.position) / (after.position - before.position)
  /** A hex colour's red, green and blue channels. */
  const channels = (color: string) => [1, 3, 5].map(i => parseInt(color.slice(i, i + 2), 16))
  const [from, to] = [channels(before.color), channels(after.color)]
  return {
    color: `#${from
      .map((c, i) =>
        Math.round(c + (to[i] - c) * t)
          .toString(16)
          .padStart(2, '0'),
      )
      .join('')}`,
    alpha: round(before.alpha + (after.alpha - before.alpha) * t),
  }
}

/**
 * A Figma-style editor for the scrim's colour stops: a bar from the centre to the edge with a marker per stop. Drag a
 * marker to move it, click the bar to add a stop, and select a stop to set its colour, opacity and position or delete
 * it. Starts from the shipped stops (SCRIM_STOPS) until edited.
 */
const GradientEditor = ({
  value,
  fallbackStops,
  onChange,
}: {
  value: string | undefined
  fallbackStops: Stop[]
  onChange: (value: string | undefined) => void
}) => {
  const stops = value ? parseStops(value) : fallbackStops
  const [selected, setSelected] = useState(0)
  const current = stops[Math.min(selected, stops.length - 1)]

  /**
   * Writes a new set of stops. They are saved sorted by position, so the selection follows the given stop to wherever
   * sorting puts it.
   */
  const update = (next: Stop[], select?: Stop) => {
    const sorted = [...next].sort((a, b) => a.position - b.position)
    if (select) setSelected(sorted.indexOf(select))
    onChange(formatStops(sorted))
  }
  /** Changes the selected stop. */
  const updateSelected = (patch: Partial<Stop>) => {
    const edited = { ...current, ...patch }
    update(
      stops.map(stop => (stop === current ? edited : stop)),
      edited,
    )
  }

  /** The position on the bar under the pointer, 0–100. */
  const positionAt = (bar: HTMLElement, clientX: number) => {
    const rect = bar.getBoundingClientRect()
    return round(Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100)))
  }

  /** Adds a stop where the bar was clicked, coloured as the gradient is there. */
  const addStop = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return
    const position = positionAt(e.currentTarget, e.clientX)
    const added = { ...sampleStops(stops, position), position }
    update([...stops, added], added)
  }

  /** Starts dragging a stop along the bar. */
  const dragStop = (index: number) => (e: ReactPointerEvent<HTMLDivElement>) => {
    e.stopPropagation()
    setSelected(index)
    const marker = e.currentTarget
    const bar = marker.parentElement!
    marker.setPointerCapture(e.pointerId)
    let latest = stops
    let dragged = stops[index]
    /** Moves the stop to the pointer. */
    const move = (event: PointerEvent) => {
      const moved = { ...dragged, position: positionAt(bar, event.clientX) }
      latest = latest.map(stop => (stop === dragged ? moved : stop))
      dragged = moved
      update(latest, moved)
    }
    /** Ends the drag. */
    const up = () => {
      marker.removeEventListener('pointermove', move)
      marker.removeEventListener('pointerup', up)
    }
    marker.addEventListener('pointermove', move)
    marker.addEventListener('pointerup', up)
  }

  const css = formatStops(stops)
  const checker = 'repeating-conic-gradient(rgb(60, 60, 66) 0% 25%, rgb(30, 30, 34) 0% 50%) 0 0 / 10px 10px'

  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <span style={{ flex: 1, color: value ? 'rgb(170, 200, 255)' : undefined }}>gradient</span>
        <button
          style={{ ...buttonStyle, visibility: value ? 'visible' : 'hidden' }}
          onClick={() => onChange(undefined)}
        >
          back to dials
        </button>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', opacity: 0.5, fontSize: 10 }}>
        <span>centre</span>
        <span>edge</span>
      </div>
      <div
        onPointerDown={addStop}
        title='Click to add a stop'
        style={{
          position: 'relative',
          height: 22,
          margin: '2px 6px 14px',
          borderRadius: 4,
          border: '1px solid rgba(255, 255, 255, 0.25)',
          background: `linear-gradient(to right, ${css}), ${checker}`,
          cursor: 'copy',
          touchAction: 'none',
        }}
      >
        {stops.map((stop, i) => (
          <div
            key={i}
            onPointerDown={dragStop(i)}
            title='Drag to move; select to edit'
            style={{
              position: 'absolute',
              left: `calc(${stop.position}% - 6px)`,
              top: 16,
              width: 12,
              height: 12,
              borderRadius: 3,
              background: stop.color,
              border: `2px solid ${i === Math.min(selected, stops.length - 1) ? 'rgb(120, 200, 255)' : 'white'}`,
              boxShadow: '0 0 4px rgba(0, 0, 0, 0.8)',
              cursor: 'ew-resize',
              touchAction: 'none',
            }}
          />
        ))}
      </div>
      {current && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <input
            type='color'
            value={current.color}
            onChange={e => updateSelected({ color: e.target.value })}
            style={{ width: 28, height: 20, padding: 0, border: 'none', background: 'none', cursor: 'pointer' }}
          />
          <input
            type='range'
            min={0}
            max={1}
            step={0.01}
            value={current.alpha}
            onChange={e => updateSelected({ alpha: Number(e.target.value) })}
            title='Opacity'
            style={{ flex: 1, minWidth: 60, margin: 0 }}
          />
          <span style={{ width: 30, textAlign: 'right' }}>{Math.round(current.alpha * 100)}%</span>
          <input
            type='number'
            min={0}
            max={100}
            value={current.position}
            onChange={e => updateSelected({ position: Math.min(100, Math.max(0, Number(e.target.value))) })}
            title='Position, from the centre (0) to the edge (100)'
            style={{ ...buttonStyle, width: 44, cursor: 'text', textAlign: 'right' }}
          />
          <button
            style={buttonStyle}
            disabled={stops.length <= 2}
            onClick={() => {
              update(stops.filter((_, i) => i !== Math.min(selected, stops.length - 1)))
              setSelected(0)
            }}
            title='Delete this stop'
          >
            delete
          </button>
        </div>
      )}
    </div>
  )
}

/**
 * Dev-only dials for the desktop Command Universe glass. Shown inline while the Command Universe is open on desktop, or
 * in a popup window at any time once popped out.
 */
const CommandUniverseGlassDebugPanel = () => {
  const isOpen = useSelector(state => state.showCommandUniverse)
  const isDesktop = useBreakpoint('lg')
  const [overrides, setOverrides] = useState<Overrides>(loadOverrides)
  const [collapsed, setCollapsed] = useState(false)
  const [copied, setCopied] = useState(false)
  const [popup, setPopup] = useState<Window | null>(null)
  const [syncStatus, setSyncStatus] = useState(
    import.meta.hot ? 'connecting to the dev server…' : 'no dev server: this browser only',
  )

  // Write the overrides to <html>, and remove properties that are no longer overridden. Persist them across reloads.
  useEffect(() => {
    const root = document.documentElement
    SECTIONS.flatMap(section => section.controls).forEach(control => {
      const value = overrides[control.name]
      if (value === undefined) root.style.removeProperty(control.name)
      else root.style.setProperty(control.name, `${value}${control.unit}`)
    })
    // Inject the CSS of every switch that is on.
    const debugCss = SECTIONS.flatMap(section => section.controls)
      .filter(control => control.css && overrides[control.name])
      .map(control => control.css)
      .join('\n')
    let styleElement = document.getElementById('cu-glass-debug-css')
    if (!styleElement) {
      styleElement = document.createElement('style')
      styleElement.id = 'cu-glass-debug-css'
      document.head.appendChild(styleElement)
    }
    styleElement.textContent = debugCss
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(overrides))
    } catch {
      // Storage is a convenience only.
    }
  }, [overrides])

  // Take the dev server's overrides on load, and every other device's changes as they are made. If the server has none
  // yet, this browser's stored overrides seed it.
  useEffect(() => {
    const hot = import.meta.hot
    if (!hot) return
    /** Applies the server's overrides, the reply to a pull. */
    const onState = (state: Overrides) => {
      const local = loadOverrides()
      if (Object.keys(state).length === 0 && Object.keys(local).length > 0) {
        hot.send('cu-glass-dials:change', { from: clientId, changes: local } satisfies DialChange)
      } else {
        setOverrides(state)
      }
      setSyncStatus(`synced with the dev server · ${now()}`)
    }
    /** Applies another device's change. */
    const onChange = (data: DialChange) => {
      if (data.from === clientId) return
      setOverrides(prev => applyChanges(prev, data.changes))
      setSyncStatus(`received from another device · ${now()}`)
    }
    hot.on('cu-glass-dials:state', onState)
    hot.on('cu-glass-dials:change', onChange)
    hot.send('cu-glass-dials:pull', {})
    return () => {
      hot.off('cu-glass-dials:state', onState)
      hot.off('cu-glass-dials:change', onChange)
    }
  }, [])

  // Close the popup with this window, and when the panel unmounts.
  useEffect(() => {
    if (!popup) return
    /** Closes the popup so it does not outlive the window it controls. */
    const closePopup = () => popup.close()
    window.addEventListener('pagehide', closePopup)
    return () => {
      window.removeEventListener('pagehide', closePopup)
      closePopup()
    }
  }, [popup])

  /** Applies a change here and shares it with every other device on the dev server. */
  const change = (changes: DialChange['changes']) => {
    setOverrides(prev => applyChanges(prev, changes))
    import.meta.hot?.send('cu-glass-dials:change', { from: clientId, changes } satisfies DialChange)
  }

  /** Sets or, with undefined, clears one override. */
  const set = (name: string, value: number | string | undefined) =>
    change({ [name]: value === undefined || (typeof value === 'number' && Number.isNaN(value)) ? null : value })

  /** Clears every override in the given sections. */
  const reset = (sections: Section[]) =>
    change(Object.fromEntries(sections.flatMap(section => section.controls).map(control => [control.name, null])))

  /** Copies the set overrides, with units, as JSON, to the clipboard of the window holding the controls. */
  const copy = () => {
    const withUnits = Object.fromEntries(
      Object.entries(overrides).map(([name, value]) => [name, `${value}${controlFor(name)?.unit ?? ''}`]),
    )
    // The click's user activation belongs to the window that was clicked.
    ;(popup ?? window).navigator.clipboard.writeText(JSON.stringify(withUnits, null, 2)).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1200)
    })
  }

  /**
   * Opens the controls in their own window. The component still runs in this window, so the overrides, the sync, and
   * the custom properties all stay here; the popup only holds the controls. They are styled inline, so no stylesheets
   * need copying. Keys pressed there never reach the Command Universe, which captures Escape and the arrows here.
   */
  const openPopup = () => {
    const win = window.open('', 'cuGlassDials', 'popup,width=320,height=900')
    if (!win) return
    win.document.title = 'CU glass dials'
    win.document.body.innerHTML = ''
    win.document.body.style.margin = '0'
    win.document.body.style.padding = '10px'
    win.document.body.style.background = 'rgb(16, 16, 20)'
    win.document.body.style.colorScheme = 'dark'
    win.addEventListener('pagehide', () => setPopup(null))
    setPopup(win)
  }

  const controls = (
    <>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: collapsed ? 0 : 6 }}>
        <strong style={{ flex: 1 }}>CU glass dials</strong>
        <button style={buttonStyle} onClick={copy}>
          {copied ? 'copied' : 'copy'}
        </button>
        <button style={buttonStyle} onClick={() => reset(SECTIONS)}>
          reset all
        </button>
        <button
          style={buttonStyle}
          onClick={() => (popup ? popup.close() : openPopup())}
          title={popup ? 'Put the dials back in this window' : 'Pop the dials out into their own window'}
        >
          {popup ? 'dock' : 'pop out'}
        </button>
        {!popup && (
          <button style={buttonStyle} onClick={() => setCollapsed(c => !c)}>
            {collapsed ? '+' : '–'}
          </button>
        )}
      </div>
      {(!collapsed || popup) && (
        <>
          <div style={{ opacity: 0.5, marginBottom: 4 }}>{syncStatus}</div>
          {SECTIONS.map(section => (
            <div key={section.title} style={{ borderTop: '1px solid rgba(255, 255, 255, 0.12)', padding: '6px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
                <span style={{ flex: 1, opacity: 0.7, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  {section.title}
                </span>
                <button style={buttonStyle} onClick={() => reset([section])}>
                  reset
                </button>
              </div>
              {section.controls.map(control => {
                const value = overrides[control.name]
                const isSet = value !== undefined
                if (control.gradient) {
                  return (
                    <GradientEditor
                      key={control.name}
                      value={isSet ? String(value) : undefined}
                      fallbackStops={parseStops(SCRIM_STOPS)}
                      onChange={next => set(control.name, next)}
                    />
                  )
                }
                if (control.color) {
                  return (
                    <div
                      key={control.name}
                      title={control.hint}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}
                    >
                      <span style={{ flex: 1, color: isSet ? 'rgb(170, 200, 255)' : undefined }}>{control.label}</span>
                      <span style={{ opacity: 0.6 }}>{isSet ? String(value) : control.color}</span>
                      <input
                        type='color'
                        value={isSet ? String(value) : control.color}
                        onChange={e => set(control.name, e.target.value)}
                        style={{
                          width: 32,
                          height: 20,
                          padding: 0,
                          border: 'none',
                          background: 'none',
                          cursor: 'pointer',
                        }}
                      />
                      <button
                        style={{ ...buttonStyle, visibility: isSet ? 'visible' : 'hidden' }}
                        onClick={() => set(control.name, undefined)}
                        title='Back to the shipped colour'
                      >
                        ×
                      </button>
                    </div>
                  )
                }
                if (control.css !== undefined) {
                  return (
                    <label
                      key={control.name}
                      title={control.hint}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, cursor: 'pointer' }}
                    >
                      <input
                        type='checkbox'
                        checked={!!value}
                        onChange={e => set(control.name, e.target.checked ? 1 : undefined)}
                      />
                      <span style={{ color: value ? 'rgb(170, 200, 255)' : undefined }}>
                        {control.label}
                        {control.hint ? ' ⓘ' : ''}
                      </span>
                    </label>
                  )
                }
                return (
                  <div key={control.name} style={{ marginBottom: 4 }} title={control.hint}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ flex: 1, color: isSet ? 'rgb(170, 200, 255)' : undefined }}>
                        {control.label}
                        {control.hint ? ' ⓘ' : ''}
                      </span>
                      <input
                        type='number'
                        value={isSet ? value : ''}
                        placeholder={`${control.fallback}`}
                        step={control.step}
                        onChange={e => set(control.name, e.target.value === '' ? undefined : Number(e.target.value))}
                        style={{ ...buttonStyle, width: 58, cursor: 'text', textAlign: 'right' }}
                      />
                      <span style={{ width: 18, opacity: 0.6 }}>{control.unit}</span>
                    </div>
                    <input
                      type='range'
                      min={control.min}
                      max={control.max}
                      step={control.step}
                      value={isSet ? Number(value) : control.fallback}
                      onChange={e => set(control.name, Number(e.target.value))}
                      onDoubleClick={() => set(control.name, undefined)}
                      style={{ width: '100%', margin: 0, opacity: isSet ? 1 : 0.55 }}
                    />
                  </div>
                )
              })}
            </div>
          ))}
          <div style={{ opacity: 0.5 }}>Blue = overridden. Double-click a slider to clear it.</div>
        </>
      )}
    </>
  )

  // Drawn in this window, over the page, whether the controls are here or in the popup.
  const handles =
    isOpen && isDesktop && overrides['--cu-scrim-handles']
      ? createPortal(<ScrimHandles overrides={overrides} set={set} />, document.body)
      : null

  if (popup)
    return (
      <>
        {createPortal(<div style={textStyle}>{controls}</div>, popup.document.body)}
        {handles}
      </>
    )
  if (!isOpen || !isDesktop) return null
  return (
    <>
      {handles}
      <div
        // Presses on the panel are not outside the dialog, so they do not close the Command Universe.
        data-above-dialog
        style={panelStyle}
        onMouseDown={e => e.stopPropagation()}
        onTouchStart={e => e.stopPropagation()}
      >
        {controls}
      </div>
    </>
  )
}

export default CommandUniverseGlassDebugPanel
