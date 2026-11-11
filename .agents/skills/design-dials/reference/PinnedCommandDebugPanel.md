# Reference: the debug panel this skill was distilled from

The dev-only panel used to tune the pinned command overlay, kept here after it was stripped from the app. It shows the control model (slider plus free text per custom property, fallbacks as placeholders), collapsible sections, copy/reset, the popup window portal, touch-friendly resize and zoom, and the WYSIWYG region picker with its relative readout. It is a snapshot, not maintained code: imports and tokens refer to the app as it was.

```tsx
import { ReactNode, PointerEvent as ReactPointerEvent, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { css } from '../../../styled-system/css'
import storage from '../../util/storage'

/*
 * TEMPORARY. A dev-only panel for dialing in the pinned command overlay. Every control writes a custom property that
 * the notification recipe or PinnedCommandTooltip reads with a baked-in fallback. The controls are grouped by the
 * component they tune, in collapsible sections whose open state persists across reloads. Once the values are
 * settled, bake them into those fallbacks and delete this file and its mount in AppComponent. Mounted in every
 * development build except automated runs.
 */

interface Control {
  /** The custom property this control writes. */
  name: string
  label: string
  /** Numeric controls also get a slider that writes `${value}${unit}`. Color controls also get a native picker that writes a hex value. Text controls take any CSS value. */
  kind: 'number' | 'text' | 'color'
  min?: number
  max?: number
  step?: number
  unit?: string
  /** Shown as the placeholder so the baked-in fallback is visible beside the override. */
  fallback: string
}

const GLOW_CONTROLS: Control[] = [
  {
    name: '--pinned-command-glow-width',
    label: 'width',
    kind: 'number',
    min: 100,
    max: 3000,
    step: 10,
    unit: 'px',
    fallback: '329.7vw | min(242.7vh, 1000px)',
  },
  {
    name: '--pinned-command-glow-height',
    label: 'height',
    kind: 'number',
    min: 50,
    max: 1500,
    step: 10,
    unit: 'px',
    fallback: 'auto (aspect ratio 3166 / 1617)',
  },
  {
    name: '--pinned-command-glow-bottom',
    label: 'bottom',
    kind: 'number',
    min: -800,
    max: 400,
    step: 4,
    unit: 'px',
    fallback: 'calc(-53.5vw + safe-area) | calc(max(-46.9vh, -193.2px) + safe-area)',
  },
  {
    name: '--pinned-command-glow-left',
    label: 'left (portrait)',
    kind: 'number',
    min: -1500,
    max: 400,
    step: 4,
    unit: 'px',
    fallback: '-69.7vw',
  },
  {
    name: '--pinned-command-glow-right',
    label: 'right (landscape)',
    kind: 'number',
    min: -1500,
    max: 400,
    step: 4,
    unit: 'px',
    fallback: 'max(-113.5vh, -467.6px)',
  },
  {
    name: '--pinned-command-glow-opacity',
    label: 'opacity',
    kind: 'number',
    min: 0,
    max: 1,
    step: 0.01,
    unit: '',
    fallback: '1',
  },
  {
    name: '--pinned-command-glow-blur',
    label: 'blur',
    kind: 'number',
    min: 0,
    max: 80,
    step: 1,
    unit: 'px',
    fallback: '0px | 16px',
  },
  {
    name: '--pinned-command-glow-background-size',
    label: 'background-size',
    kind: 'text',
    fallback: '100% 100%',
  },
  {
    name: '--pinned-command-glow-background-position',
    label: 'background-position',
    kind: 'text',
    fallback: '0 0',
  },
  { name: '--pinned-command-glow-transform', label: 'transform', kind: 'text', fallback: 'none (try scaleX(-1))' },
]

/** The bottom-right anchor's blur and scrim corner, shared with Tip. Only applies at lg. */
const CORNER_CONTROLS: Control[] = [
  {
    name: '--notification-corner-width',
    label: 'corner width',
    kind: 'number',
    min: 100,
    max: 2000,
    step: 10,
    unit: 'px',
    fallback: 'min(80vw, 40rem)',
  },
  {
    name: '--notification-corner-height',
    label: 'corner height',
    kind: 'number',
    min: 50,
    max: 1200,
    step: 10,
    unit: 'px',
    fallback: '100% (the content height)',
  },
  {
    name: '--notification-corner-fade',
    label: 'corner solid extent (fade starts here)',
    kind: 'number',
    min: 0,
    max: 100,
    step: 1,
    unit: '%',
    fallback: '35%',
  },
]

/** The portrait gesture diagram and the glow image behind it, sized relative to the diagram box. */
const GESTURE_CONTROLS: Control[] = [
  {
    name: '--pinned-command-gesture-size',
    label: 'diagram width',
    kind: 'number',
    min: 40,
    max: 400,
    step: 2,
    unit: 'px',
    fallback: '50.9vw (200px at 393)',
  },
  {
    name: '--pinned-command-gesture-gap',
    label: 'gap below diagram',
    kind: 'number',
    min: 0,
    max: 200,
    step: 2,
    unit: 'px',
    fallback: '2.5rem',
  },
  {
    name: '--pinned-command-gesture-offset-x',
    label: 'diagram offset x (left edge)',
    kind: 'number',
    min: -40,
    max: 200,
    step: 1,
    unit: 'px',
    fallback: '1.3333rem (24px)',
  },
  {
    name: '--pinned-command-gesture-offset-y',
    label: 'diagram offset y (nudge, no layout change)',
    kind: 'number',
    min: -120,
    max: 120,
    step: 1,
    unit: 'px',
    fallback: '0.8889rem (16px)',
  },
  {
    name: '--pinned-command-gesture-glow-size',
    label: 'glow width (% of diagram)',
    kind: 'number',
    min: 50,
    max: 600,
    step: 5,
    unit: '%',
    fallback: '290%',
  },
  {
    name: '--pinned-command-gesture-glow-offset-x',
    label: 'glow offset x (% of diagram)',
    kind: 'number',
    min: -150,
    max: 150,
    step: 1,
    unit: '%',
    fallback: '-33%',
  },
  {
    name: '--pinned-command-gesture-glow-offset-y',
    label: 'glow offset y (% of diagram)',
    kind: 'number',
    min: -150,
    max: 150,
    step: 1,
    unit: '%',
    fallback: '-17%',
  },
  {
    name: '--pinned-command-gesture-glow-blur',
    label: 'glow blur',
    kind: 'number',
    min: 0,
    max: 80,
    step: 1,
    unit: 'px',
    fallback: '0px',
  },
  {
    name: '--pinned-command-gesture-glow-opacity',
    label: 'glow opacity',
    kind: 'number',
    min: 0,
    max: 1,
    step: 0.01,
    unit: '',
    fallback: '1',
  },
]

/** The command title and the instruction line below it. */
const TEXT_CONTROLS: Control[] = [
  {
    name: '--pinned-command-title-size',
    label: 'title font size',
    kind: 'number',
    min: 10,
    max: 40,
    step: 1,
    unit: 'px',
    fallback: '1rem (18px)',
  },
  {
    name: '--pinned-command-title-weight',
    label: 'title font weight',
    kind: 'number',
    min: 100,
    max: 900,
    step: 100,
    unit: '',
    fallback: '700',
  },
  { name: '--pinned-command-title-color', label: 'title color', kind: 'color', fallback: '#e8dcf8' },
  {
    name: '--pinned-command-instruction-size',
    label: 'instruction font size',
    kind: 'number',
    min: 8,
    max: 32,
    step: 1,
    unit: 'px',
    fallback: '0.7778rem (14px)',
  },
  {
    name: '--pinned-command-instruction-weight',
    label: 'instruction font weight',
    kind: 'number',
    min: 100,
    max: 900,
    step: 100,
    unit: '',
    fallback: '600',
  },
  {
    name: '--pinned-command-instruction-gradient-start',
    label: 'instruction gradient start',
    kind: 'color',
    fallback: '#97a0c2',
  },
  {
    name: '--pinned-command-instruction-gradient-end',
    label: 'instruction gradient end',
    kind: 'color',
    fallback: '#9d75c2',
  },
  {
    name: '--pinned-command-instruction-gradient-angle',
    label: 'instruction gradient angle',
    kind: 'number',
    min: 0,
    max: 360,
    step: 1,
    unit: 'deg',
    fallback: '158deg',
  },
  {
    name: '--pinned-command-instruction-opacity',
    label: 'instruction opacity',
    kind: 'number',
    min: 0,
    max: 1,
    step: 0.01,
    unit: '',
    fallback: '1',
  },
  {
    name: '--pinned-command-text-gap',
    label: 'gap between title and instruction',
    kind: 'number',
    min: 0,
    max: 40,
    step: 1,
    unit: 'px',
    fallback: '0.1111rem (2px)',
  },
]

/** The pinned command ring in the corner. */
const RING_CONTROLS: Control[] = [
  {
    name: '--pinned-command-ring-track-visibility',
    label: 'track visibility (diagnostic)',
    kind: 'text',
    fallback: 'visible (enter hidden to isolate the track)',
  },
  {
    name: '--pinned-command-ring-fill-visibility',
    label: 'fill visibility (diagnostic)',
    kind: 'text',
    fallback: 'visible (enter hidden to isolate the fill)',
  },
  {
    name: '--pinned-command-open-scale',
    label: 'scale when open',
    kind: 'number',
    min: 0.75,
    max: 1.5,
    step: 0.01,
    unit: '',
    fallback: '1.25',
  },
]

/** The learning genie button left of the overlay text. */
const GENIE_CONTROLS: Control[] = [
  { name: '--pinned-command-genie-icon-color', label: 'icon color', kind: 'color', fallback: '#abaad3' },
  {
    name: '--pinned-command-genie-size',
    label: 'genie button size',
    kind: 'number',
    min: 16,
    max: 96,
    step: 1,
    unit: 'px',
    fallback: '1.7778rem (32px)',
  },
  {
    name: '--pinned-command-genie-icon-size',
    label: 'genie icon size',
    kind: 'number',
    min: 8,
    max: 64,
    step: 1,
    unit: 'px',
    fallback: '1.3333rem (24px)',
  },
  {
    name: '--pinned-command-genie-gap',
    label: 'gap to title/instruction stack',
    kind: 'number',
    min: 0,
    max: 80,
    step: 1,
    unit: 'px',
    fallback: '1rem (18px)',
  },
  {
    name: '--pinned-command-genie-offset-x',
    label: 'genie offset x',
    kind: 'number',
    min: -60,
    max: 60,
    step: 1,
    unit: 'px',
    fallback: '0px',
  },
  {
    name: '--pinned-command-genie-offset-y',
    label: 'genie offset y',
    kind: 'number',
    min: -60,
    max: 60,
    step: 1,
    unit: 'px',
    fallback: '0px',
  },
]

/** The command label row: the chevron beside the name, the row's vertical offset, and Clear below it. */
const LABEL_CONTROLS: Control[] = [
  {
    name: '--pinned-command-chevron-opacity',
    label: 'chevron opacity',
    kind: 'number',
    min: 0,
    max: 1,
    step: 0.01,
    unit: '',
    fallback: '1',
  },
  {
    name: '--pinned-command-row-offset-y',
    label: 'row offset y',
    kind: 'number',
    min: -60,
    max: 60,
    step: 1,
    unit: 'px',
    fallback: '-0.3889rem (-7px)',
  },
  {
    name: '--pinned-command-row-padding-right',
    label: 'row right padding (room for the ring)',
    kind: 'number',
    min: 0,
    max: 200,
    step: 1,
    unit: 'px',
    fallback: '59.3px × open scale + 0.5rem − 1.5rem',
  },
  {
    name: '--pinned-command-clear-offset',
    label: 'gap above Clear',
    kind: 'number',
    min: -20,
    max: 60,
    step: 1,
    unit: 'px',
    fallback: '0.5rem',
  },
]

/** One collapsible group of controls for a single component of the overlay. */
interface Section {
  /** Stable key for the persisted open state. */
  id: string
  title: string
  /** Shown beside the title, for scope such as the breakpoint the controls apply at. */
  note?: string
  controls: Control[]
}

/** The panel's sections in display order. The 'region' section also hosts the glow thumbnail. */
const SECTIONS: Section[] = [
  { id: 'region', title: 'Visible region', note: 'glow thumbnail', controls: [] },
  { id: 'glow', title: 'Surface glow', controls: GLOW_CONTROLS },
  { id: 'text', title: 'Title and instruction', note: 'size, weight, color', controls: TEXT_CONTROLS },
  { id: 'label', title: 'Command label row', note: 'chevron, row, Clear', controls: LABEL_CONTROLS },
  { id: 'genie', title: 'Learning genie button', controls: GENIE_CONTROLS },
  { id: 'gesture', title: 'Gesture diagram and its glow', note: 'portrait only', controls: GESTURE_CONTROLS },
  { id: 'ring', title: 'Pinned command ring', controls: RING_CONTROLS },
  { id: 'corner', title: 'Blur and scrim corner', note: 'lg only, shared with Tip', controls: CORNER_CONTROLS },
  { id: 'paste', title: 'Overrides to paste back', note: 'for baking in', controls: [] },
]

const ALL_CONTROLS = SECTIONS.flatMap(section => section.controls)

const OPEN_SECTIONS_KEY = 'pinnedCommandDebug.openSections'

/** Reads the persisted set of open section ids; every section starts collapsed. */
const readOpenSections = (): string[] => {
  try {
    const parsed: unknown = JSON.parse(storage.getItem(OPEN_SECTIONS_KEY) ?? '[]')
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : []
  } catch {
    return []
  }
}

const inputStyle = css({
  width: '100%',
  boxSizing: 'border-box',
  fontSize: '11px',
  fontFamily: 'monospace',
  padding: '2px 4px',
  backgroundColor: 'fgOverlay10',
  color: 'fg',
  border: '1px solid {colors.fgOverlay20}',
  borderRadius: '3px',
})

/** One labelled control: an optional slider plus a free-form text input for the same custom property. */
const ControlRow = ({
  control,
  value,
  onChange,
}: {
  control: Control
  value: string
  onChange: (value: string) => void
}) => {
  const numeric = parseFloat(value)
  return (
    <label className={css({ display: 'grid', gap: '2px', marginBottom: '6px' })}>
      <span className={css({ opacity: 0.7 })}>
        {control.label} <code className={css({ opacity: 0.6 })}>{control.name}</code>
      </span>
      {control.kind === 'color' ? (
        <input
          type='color'
          // The picker only accepts six-digit hex; anything else in the text field leaves it on white.
          value={/^#[0-9a-f]{6}$/i.test(value) ? value : '#ffffff'}
          onChange={event => onChange(event.target.value)}
          className={css({ width: '100%', height: '22px', padding: 0, border: 0, background: 'transparent' })}
        />
      ) : null}
      {control.kind === 'number' ? (
        <input
          type='range'
          min={control.min}
          max={control.max}
          step={control.step}
          value={Number.isFinite(numeric) ? numeric : (control.min ?? 0)}
          onChange={event => onChange(`${event.target.value}${control.unit ?? ''}`)}
          className={css({ width: '100%' })}
        />
      ) : null}
      <input
        type='text'
        value={value}
        placeholder={control.fallback}
        onChange={event => onChange(event.target.value)}
        className={inputStyle}
      />
    </label>
  )
}

/**
 * One collapsible section. The summary shows how many of its properties are overridden so a tweak can be found again
 * while collapsed, and a Reset clears just this section's overrides.
 */
const CollapsibleSection = ({
  section,
  isOpen,
  onToggle,
  values,
  setValues,
  children,
}: {
  section: Section
  isOpen: boolean
  onToggle: (open: boolean) => void
  values: Record<string, string>
  setValues: (update: (previous: Record<string, string>) => Record<string, string>) => void
  /** Rendered above the section's controls. */
  children?: ReactNode
}) => {
  const overridden = section.controls.filter(control => values[control.name]).length

  /** Drops this section's overrides, leaving the others in place. */
  const resetSection = () =>
    setValues(previous => {
      const next = { ...previous }
      section.controls.forEach(control => delete next[control.name])
      return next
    })

  return (
    <details
      open={isOpen}
      onToggle={event => onToggle((event.currentTarget as HTMLDetailsElement).open)}
      className={css({
        margin: '6px 0',
        border: '1px solid {colors.fgOverlay20}',
        borderRadius: '4px',
      })}
    >
      <summary
        className={css({
          display: 'flex',
          alignItems: 'baseline',
          gap: '6px',
          padding: '4px 6px',
          cursor: 'pointer',
          fontWeight: 700,
          backgroundColor: 'fgOverlay10',
          borderRadius: '3px',
          listStyle: 'none',
          // Hide the native disclosure triangle; the span below draws one that also renders in the popup.
          '&::-webkit-details-marker': { display: 'none' },
        })}
      >
        <span aria-hidden className={css({ opacity: 0.7, width: '1em' })}>
          {isOpen ? '▾' : '▸'}
        </span>
        <span>{section.title}</span>
        {section.note ? <span className={css({ opacity: 0.5, fontWeight: 400 })}>{section.note}</span> : null}
        {overridden ? (
          <span
            className={css({
              marginLeft: 'auto',
              padding: '0 5px',
              borderRadius: '8px',
              fontWeight: 400,
              whiteSpace: 'nowrap',
              alignSelf: 'center',
              backgroundColor: 'vividHighlight',
              color: 'bg',
            })}
          >
            {overridden} set
          </span>
        ) : null}
      </summary>
      <div className={css({ padding: '6px 6px 2px' })}>
        {children}
        {section.controls.map(control => (
          <ControlRow
            key={control.name}
            control={control}
            value={values[control.name] ?? ''}
            onChange={value => setValues(previous => ({ ...previous, [control.name]: value }))}
          />
        ))}
        {section.controls.length ? (
          <button type='button' onClick={resetSection} disabled={!overridden} className={inputStyle}>
            Reset section
          </button>
        ) : null}
      </div>
    </details>
  )
}

/** How the glow image is currently laid out: the glow box in viewport pixels, the image's natural size, and the rendered background size and offset inside the box. */
interface GlowLayout {
  box: DOMRect
  image: { width: number; height: number }
  size: { width: number; height: number }
  position: { x: number; y: number }
  /** Whether the glow is mirrored with scaleX(-1). */
  flipped: boolean
}

/** A rectangle in the glow image's own pixel coordinates. */
interface ImageRect {
  u: number
  v: number
  width: number
  height: number
}

/** Resolves one computed background-size or background-position component to pixels. */
const toPx = (value: string, percentBase: number) =>
  value.endsWith('px') ? parseFloat(value) : value.endsWith('%') ? (parseFloat(value) / 100) * percentBase : null

/** Resolves a computed background-size to the rendered image size in pixels. */
const resolveBackgroundSize = (
  value: string,
  box: { width: number; height: number },
  image: { width: number; height: number },
) => {
  if (value === 'cover' || value === 'contain') {
    const scale = (value === 'cover' ? Math.max : Math.min)(box.width / image.width, box.height / image.height)
    return { width: image.width * scale, height: image.height * scale }
  }
  const [first, second = 'auto'] = value.split(/\s+/)
  const width = first === 'auto' ? null : toPx(first, box.width)
  const height = second === 'auto' ? null : toPx(second, box.height)
  return width == null && height == null
    ? { width: image.width, height: image.height }
    : {
        width: width ?? (height! * image.width) / image.height,
        height: height ?? (width! * image.height) / image.width,
      }
}

/**
 * A thumbnail of the whole glow image with the visual viewport drawn on it. Drag the viewport rectangle to pan the
 * image, or its corner handle to zoom while keeping the viewport's aspect ratio; both write absolute
 * background-size and background-position overrides. The dashed rectangle is the glow box itself, outside of which
 * the image is clipped (background-repeat is no-repeat).
 */
const GlowPreview = ({
  values,
  setValues,
  copy,
}: {
  values: Record<string, string>
  setValues: (update: (previous: Record<string, string>) => Record<string, string>) => void
  /** Writes text to the clipboard of the window the controls are rendered in. */
  copy: (text: string) => void
}) => {
  const [src, setSrc] = useState<string | null>(null)
  const [image, setImage] = useState<{ width: number; height: number } | null>(null)
  const [layout, setLayout] = useState<GlowLayout | null>(null)
  const [viewport, setViewport] = useState({ width: window.innerWidth, height: window.innerHeight })
  // The bottom anchor is baked as calc(<vw> + env(safe-area-inset-bottom)), so the readout has to subtract the inset
  // of the device it is tuned on. A hidden probe exposes the inset as a computed padding.
  const safeAreaProbeRef = useRef<HTMLDivElement>(null)
  const thumbnailRef = useRef<HTMLDivElement>(null)
  // While dragging, the rectangle is drawn from this local state so it tracks the pointer immediately instead of
  // waiting for the override to round-trip through the main document's computed style.
  const [dragRect, setDragRect] = useState<ImageRect | null>(null)
  // The stage only ever grows, so panning or zooming never shifts the canvas under the pointer. It is a ref grown in
  // place during render: the grown value is used in the same render, so no state update is needed.
  const stage = useRef<ImageRect | null>(null)
  const drag = useRef<{
    mode: 'move' | 'resize'
    startX: number
    startY: number
    rect: ImageRect
    layout: GlowLayout
    thumbnailScale: number
    frame: number | null
  } | null>(null)

  // Re-read the glow's geometry on every override change and on a short interval, since the overlay can open, close,
  // or change anchor without any signal reaching this panel.
  useEffect(() => {
    /** Reads the pinned command glow's computed layout, or null while the overlay is closed. */
    const read = () => {
      const glow = Array.from(document.querySelectorAll<HTMLElement>('[data-notification-glow]')).find(element =>
        getComputedStyle(element).backgroundImage.includes('pinned-command'),
      )
      if (!glow) return setLayout(null)
      const style = getComputedStyle(glow)
      const url = style.backgroundImage.match(/url\("?([^")]+)"?\)/)?.[1] ?? null
      setSrc(url)
      if (!image) return
      const box = glow.getBoundingClientRect()
      const size = resolveBackgroundSize(style.backgroundSize, box, image)
      const [px = '0%', py = '0%'] = style.backgroundPosition.split(/\s+/)
      const position = {
        x: toPx(px, box.width - size.width) ?? 0,
        y: toPx(py, box.height - size.height) ?? 0,
      }
      const flipped = /^matrix\(-1,/.test(style.transform)
      setLayout({ box, image, size, position, flipped })
      setViewport({ width: window.innerWidth, height: window.innerHeight })
    }
    read()
    const interval = window.setInterval(read, 250)
    return () => window.clearInterval(interval)
  }, [values, image])

  useEffect(() => {
    if (!src) return
    const loader = new Image()
    loader.onload = () => setImage({ width: loader.naturalWidth, height: loader.naturalHeight })
    loader.src = src
  }, [src])

  if (!src || !image)
    return <p className={css({ opacity: 0.6 })}>Open the pinned command overlay to preview the glow.</p>
  if (!layout) return <p className={css({ opacity: 0.6 })}>Open the pinned command overlay to preview the glow.</p>

  const { box, size, position, flipped } = layout
  const safeAreaBottom = safeAreaProbeRef.current
    ? parseFloat(getComputedStyle(safeAreaProbeRef.current).paddingBottom)
    : 0
  // The image footprint in viewport pixels, independent of how the glow box happens to crop it.
  const footprint = {
    left: flipped ? box.left + box.width - position.x - size.width : box.left + position.x,
    width: size.width,
    belowViewport: box.top + position.y + size.height - viewport.height,
  }
  // Portrait scales with viewport width and anchors left; landscape, tablet, and desktop (the recipe's lg branch)
  // scale with viewport height and anchor right, mirroring the bottom-right anchor of the surface.
  const isLandscape = viewport.width >= 600
  /** Formats a viewport-pixel length as a fraction of the viewport width. */
  const vw = (px: number) => `${((px / viewport.width) * 100).toFixed(1)}vw`
  /** Formats a viewport-pixel length as a fraction of the viewport height. */
  const vh = (px: number) => `${((px / viewport.height) * 100).toFixed(1)}vh`
  const bottomPx = -(footprint.belowViewport - safeAreaBottom)
  const relative = [
    `width: ${isLandscape ? vh(footprint.width) : vw(footprint.width)};`,
    `aspect-ratio: ${image.width} / ${image.height};`,
    isLandscape ? `right: ${vh(viewport.width - (footprint.left + footprint.width))};` : `left: ${vw(footprint.left)};`,
    `bottom: calc(${isLandscape ? vh(bottomPx) : vw(bottomPx)} + env(safe-area-inset-bottom));`,
    'background-size: 100% 100%;',
    'background-position: 0 0;',
  ].join('\n')
  const scaleU = size.width / image.width
  const scaleV = size.height / image.height
  /** Maps a viewport x to an image u coordinate. */
  const toU = (x: number) => (flipped ? box.left + box.width - x - position.x : x - box.left - position.x) / scaleU
  /** Maps a viewport y to an image v coordinate. */
  const toV = (y: number) => (y - box.top - position.y) / scaleV
  const domRect: ImageRect = {
    u: Math.min(toU(0), toU(viewport.width)),
    v: toV(0),
    width: viewport.width / scaleU,
    height: viewport.height / scaleV,
  }
  const viewportRect = dragRect ?? domRect
  const boxRect: ImageRect = {
    u: -position.x / scaleU,
    v: -position.y / scaleV,
    width: box.width / scaleU,
    height: box.height / scaleV,
  }

  // The stage must cover the image, the viewport, and the glow box, so a viewport taller than the image (portrait with
  // cover) still fits inside it. It grows to include them and never shrinks while mounted.
  const margin = image.width * 0.03
  const neededU = Math.min(0, viewportRect.u, boxRect.u) - margin
  const neededV = Math.min(0, viewportRect.v, boxRect.v) - margin
  const needed: ImageRect = {
    u: neededU,
    v: neededV,
    width: Math.max(image.width, viewportRect.u + viewportRect.width, boxRect.u + boxRect.width) - neededU + margin,
    height: Math.max(image.height, viewportRect.v + viewportRect.height, boxRect.v + boxRect.height) - neededV + margin,
  }
  const previous = stage.current
  const shownStage: ImageRect = previous
    ? (() => {
        const u = Math.min(previous.u, needed.u)
        const v = Math.min(previous.v, needed.v)
        return {
          u,
          v,
          width: Math.max(previous.u + previous.width, needed.u + needed.width) - u,
          height: Math.max(previous.v + previous.height, needed.v + needed.height) - v,
        }
      })()
    : needed
  stage.current = shownStage

  /** Converts an image-space viewport rectangle back into background-size and background-position overrides. */
  const apply = (rect: ImageRect, from: GlowLayout) => {
    const ku = viewport.width / rect.width
    const kv = viewport.height / rect.height
    const x = from.flipped
      ? from.box.left + from.box.width - viewport.width - rect.u * ku
      : -from.box.left - rect.u * ku
    const y = -from.box.top - rect.v * kv
    setValues(previous => ({
      ...previous,
      '--pinned-command-glow-background-size': `${(from.image.width * ku).toFixed(1)}px ${(from.image.height * kv).toFixed(1)}px`,
      '--pinned-command-glow-background-position': `${x.toFixed(1)}px ${y.toFixed(1)}px`,
    }))
  }

  /** Starts a pan from the rectangle body or a zoom from its corner handle. */
  const onPointerDown = (mode: 'move' | 'resize') => (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!thumbnailRef.current) return
    event.stopPropagation()
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    drag.current = {
      mode,
      startX: event.clientX,
      startY: event.clientY,
      rect: viewportRect,
      layout,
      thumbnailScale: shownStage.width / thumbnailRef.current.clientWidth,
      frame: null,
    }
    setDragRect(viewportRect)
  }

  /** Pans or zooms by the pointer's travel, scaled from thumbnail pixels to image pixels. */
  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const current = drag.current
    if (!current) return
    const du = (event.clientX - current.startX) * current.thumbnailScale
    const dv = (event.clientY - current.startY) * current.thumbnailScale
    const start = current.rect
    let rect: ImageRect
    if (current.mode === 'move') {
      rect = { ...start, u: start.u + du, v: start.v + dv }
    } else {
      // Zoom keeps the viewport's aspect ratio so the image scales uniformly. The corner follows whichever axis the
      // pointer has moved more along, relative to the rectangle's size, so it tracks a diagonal drag closely.
      const scale = Math.max(
        0.05,
        Math.abs(du) / start.width >= Math.abs(dv) / start.height
          ? (start.width + du) / start.width
          : (start.height + dv) / start.height,
      )
      rect = { ...start, width: start.width * scale, height: start.height * scale }
    }
    setDragRect(rect)
    // Write the override once per frame; the main window repaints its glow from it.
    if (current.frame != null) cancelAnimationFrame(current.frame)
    current.frame = requestAnimationFrame(() => apply(rect, current.layout))
  }

  /** Ends the drag, flushing the last override and handing the rectangle back to the computed layout. */
  const onPointerUp = () => {
    const current = drag.current
    if (!current) return
    if (current.frame != null) cancelAnimationFrame(current.frame)
    if (dragRect) apply(dragRect, current.layout)
    drag.current = null
    setDragRect(null)
  }

  /** Positions an image-space rectangle on the stage as percentages. */
  const percentBox = (rect: ImageRect) => ({
    left: `${((rect.u - shownStage.u) / shownStage.width) * 100}%`,
    top: `${((rect.v - shownStage.v) / shownStage.height) * 100}%`,
    width: `${(rect.width / shownStage.width) * 100}%`,
    height: `${(rect.height / shownStage.height) * 100}%`,
  })

  return (
    <div className={css({ marginBottom: '8px' })}>
      <div
        ref={thumbnailRef}
        className={css({ position: 'relative', width: '100%', backgroundColor: 'bgOverlay80', overflow: 'hidden' })}
        style={{ aspectRatio: `${shownStage.width} / ${shownStage.height}` }}
      >
        <img
          src={src}
          alt=''
          className={css({ position: 'absolute', display: 'block', backgroundColor: 'black' })}
          style={{
            ...percentBox({ u: 0, v: 0, width: image.width, height: image.height }),
            transform: flipped ? 'scaleX(-1)' : undefined,
          }}
        />
        <div
          className={css({ position: 'absolute', border: '1px dashed {colors.fgOverlay40}', pointerEvents: 'none' })}
          style={percentBox(boxRect)}
        />
        <div
          onPointerDown={onPointerDown('move')}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          className={css({
            position: 'absolute',
            border: '1.5px solid {colors.vividHighlight}',
            backgroundColor: 'fgOverlay10',
            cursor: 'move',
            touchAction: 'none',
          })}
          style={percentBox(viewportRect)}
        >
          <div
            onPointerDown={onPointerDown('resize')}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            className={css({
              position: 'absolute',
              right: '-6px',
              bottom: '-6px',
              width: '12px',
              height: '12px',
              backgroundColor: 'vividHighlight',
              cursor: 'nwse-resize',
              touchAction: 'none',
            })}
          />
        </div>
      </div>
      <p className={css({ margin: '4px 0', opacity: 0.6 })}>
        Solid: visual viewport ({viewport.width}×{viewport.height}); drag to pan, corner to zoom. Dashed: glow box
        (image is clipped outside it). Image {image.width}×{image.height} rendered at {size.width.toFixed(0)}×
        {size.height.toFixed(0)} at {position.x.toFixed(0)},{position.y.toFixed(0)}.
      </p>
      <div
        ref={safeAreaProbeRef}
        aria-hidden
        className={css({ paddingBottom: 'safeAreaBottom', height: 0, overflow: 'hidden' })}
      />
      <p className={css({ margin: '6px 0 2px', opacity: 0.8 })}>
        Recipe form with the image footprint as the glow box:{' '}
        {isLandscape
          ? 'lg, relative to viewport height, right-anchored'
          : 'base, relative to viewport width, left-anchored'}{' '}
        (safe-area inset here is {safeAreaBottom.toFixed(0)}px):
      </p>
      <pre
        className={css({
          margin: '0 0 4px',
          padding: '4px 6px',
          fontSize: '11px',
          whiteSpace: 'pre-wrap',
          backgroundColor: 'fgOverlay10',
          border: '1px solid {colors.fgOverlay20}',
          borderRadius: '3px',
        })}
      >
        {relative}
      </pre>
      <button type='button' onClick={() => copy(relative)} className={inputStyle}>
        Copy relative
      </button>
    </div>
  )
}

/** Dev-only panel that overrides the pinned command overlay's tunable custom properties on the main document. The controls render inline or, on request, in a popup window that keeps driving this window. */
const PinnedCommandDebugPanel = () => {
  const [values, setValues] = useState<Record<string, string>>({
    '--pinned-command-glow-blur': '0px',
    '--pinned-command-ring-fill-visibility': 'hidden',
  })
  const [openSections, setOpenSections] = useState<string[]>(readOpenSections)
  const [isLandscape, setIsLandscape] = useState(() => window.matchMedia('(min-width: 600px)').matches)
  const [popup, setPopup] = useState<Window | null>(null)
  // The inline panel can be dragged larger or smaller from its corner grip and zoomed down out of the way. Pointer
  // events rather than CSS resize so it works on touch.
  const [panelSize, setPanelSize] = useState({ width: 260, height: Math.round(window.innerHeight * 0.7) })
  const [panelZoom, setPanelZoom] = useState(1)
  const panelResize = useRef<{ startX: number; startY: number; width: number; height: number } | null>(null)

  /** Expands or collapses one section and remembers the choice for the next reload. */
  const toggleSection = (id: string, open: boolean) =>
    setOpenSections(previous => {
      const next = open ? [...new Set([...previous, id])] : previous.filter(section => section !== id)
      storage.setItem(OPEN_SECTIONS_KEY, JSON.stringify(next))
      return next
    })

  useEffect(() => {
    const media = window.matchMedia('(min-width: 600px)')
    /** Track which anchor the recipe is using so the panel can say which fallbacks apply. */
    const handleChange = (event: MediaQueryListEvent) => setIsLandscape(event.matches)
    media.addEventListener('change', handleChange)
    return () => media.removeEventListener('change', handleChange)
  }, [])

  useEffect(() => {
    const root = document.documentElement.style
    ALL_CONTROLS.forEach(control => {
      const value = values[control.name]
      if (value) root.setProperty(control.name, value)
      else root.removeProperty(control.name)
    })
    return () => ALL_CONTROLS.forEach(control => root.removeProperty(control.name))
  }, [values])

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

  /**
   * Opens a popup and mirrors this document's stylesheets and root attributes into it so the portaled controls keep
   * their Panda classes and theme tokens. The component code still runs in this window, so state, the custom
   * properties, and matchMedia all refer to the main document. Styles are copied once; reopen after a style change.
   */
  const openPopup = () => {
    const win = window.open('', 'pinnedCommandDebug', 'popup,width=520,height=960')
    if (!win) return
    win.document.head.innerHTML = ''
    win.document.body.innerHTML = ''
    win.document.title = 'Pinned command debug'
    // Relative urls in copied styles (fonts, images) resolve against about:blank without a base.
    const base = win.document.createElement('base')
    base.href = window.location.origin + '/'
    win.document.head.appendChild(base)
    document.querySelectorAll<HTMLStyleElement | HTMLLinkElement>('style, link[rel="stylesheet"]').forEach(node => {
      const clone = node.cloneNode(true) as HTMLStyleElement | HTMLLinkElement
      if (clone instanceof HTMLLinkElement) clone.href = (node as HTMLLinkElement).href
      win.document.head.appendChild(clone)
    })
    // Theme tokens are keyed off data-color-mode on <body>; copy every root and body attribute except the inline
    // style, which on <html> holds this panel's overrides.
    ;[document.documentElement, document.body].forEach((source, i) => {
      const target = i === 0 ? win.document.documentElement : win.document.body
      Array.from(source.attributes)
        .filter(attribute => attribute.name !== 'style')
        .forEach(attribute => target.setAttribute(attribute.name, attribute.value))
    })
    win.document.body.style.margin = '0'
    win.document.body.style.background = getComputedStyle(document.body).backgroundColor
    win.addEventListener('pagehide', () => setPopup(null))
    setPopup(win)
  }

  /** Opens or closes every section at once. */
  const setAllSections = (open: boolean) => {
    const next = open ? SECTIONS.map(section => section.id) : []
    storage.setItem(OPEN_SECTIONS_KEY, JSON.stringify(next))
    setOpenSections(next)
  }

  const set = Object.fromEntries(Object.entries(values).filter(([, value]) => value))
  // Every override grouped by section with the fallback it replaces, so the list can be pasted back into a chat
  // and each value located in the code it belongs to.
  const overrideRows = SECTIONS.flatMap(section => {
    const rows = section.controls
      .filter(control => values[control.name])
      .map(control => `${control.name}: ${values[control.name]};  /* was ${control.fallback} */`)
    return rows.length ? [`// ${section.title}`, ...rows] : []
  })
  const pasteText = [
    `// pinned command overrides · ${isLandscape ? 'lg / bottom-right' : 'base / bottom-full'} · ${window.innerWidth}×${window.innerHeight}`,
    ...(overrideRows.length ? overrideRows : ['// no overrides yet']),
  ].join('\n')
  /** Writes to the clipboard of the window holding the controls; the click's user activation belongs to that window. */
  const copy = (text: string) => (popup ?? window).navigator.clipboard.writeText(text)
  const heading = `Pinned command debug · ${isLandscape ? 'lg / bottom-right' : 'base / bottom-full'}`

  const controls = (
    <>
      <div className={css({ display: 'flex', gap: '6px', margin: '6px 0' })}>
        <button type='button' onClick={() => copy(JSON.stringify(set, null, 2))} className={inputStyle}>
          Copy overrides
        </button>
        <button type='button' onClick={() => setValues({})} className={inputStyle}>
          Reset
        </button>
        <button type='button' onClick={() => (popup ? popup.close() : openPopup())} className={inputStyle}>
          {popup ? 'Close popup' : 'Open in popup'}
        </button>
      </div>
      <p className={css({ margin: '4px 0', opacity: 0.6 })}>
        Empty = baked fallback (shown as placeholder; portrait | landscape where they differ).
      </p>
      <div className={css({ display: 'flex', gap: '6px', margin: '4px 0' })}>
        <button type='button' onClick={() => setAllSections(true)} className={inputStyle}>
          Expand all
        </button>
        <button type='button' onClick={() => setAllSections(false)} className={inputStyle}>
          Collapse all
        </button>
      </div>
      {SECTIONS.map(section => (
        <CollapsibleSection
          key={section.id}
          section={section}
          isOpen={openSections.includes(section.id)}
          onToggle={open => toggleSection(section.id, open)}
          values={values}
          setValues={setValues}
        >
          {section.id === 'region' ? <GlowPreview values={values} setValues={setValues} copy={copy} /> : null}
          {section.id === 'paste' ? (
            <>
              <pre
                className={css({
                  margin: '0 0 4px',
                  padding: '4px 6px',
                  fontSize: '11px',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all',
                  userSelect: 'text',
                  backgroundColor: 'fgOverlay10',
                  border: '1px solid {colors.fgOverlay20}',
                  borderRadius: '3px',
                })}
              >
                {pasteText}
              </pre>
              <button type='button' onClick={() => copy(pasteText)} className={inputStyle}>
                Copy
              </button>
            </>
          ) : null}
        </CollapsibleSection>
      ))}
    </>
  )

  return (
    <>
      <div
        // PinnedCommandTooltip dismisses on any tap, but skips pointers that go down inside this attribute so the
        // overlay stays open while it is being tuned.
        data-pinned-command-debug=''
        className={css({
          position: 'fixed',
          top: 'safeAreaTop',
          left: 0,
          zIndex: 'dialog',
          transformOrigin: 'top left',
          fontSize: '11px',
          fontFamily: 'monospace',
          color: 'fg',
        })}
        style={{ width: panelSize.width, height: panelSize.height, transform: `scale(${panelZoom})` }}
      >
        <details
          open
          className={css({
            boxSizing: 'border-box',
            width: '100%',
            height: '100%',
            overflowY: 'auto',
            padding: '6px 8px',
            backgroundColor: 'bgOverlay80',
            border: '1px solid {colors.fgOverlay20}',
            borderRadius: '0 0 6px 0',
            touchAction: 'pan-y',
          })}
        >
          <summary className={css({ cursor: 'pointer', fontWeight: 700 })}>
            {heading}
            <label
              // Clicks inside the summary toggle it; keep the zoom control from doing that.
              onClick={event => event.preventDefault()}
              className={css({ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 400, opacity: 0.8 })}
            >
              zoom
              <input
                type='range'
                min={0.4}
                max={1}
                step={0.05}
                value={panelZoom}
                onChange={event => setPanelZoom(parseFloat(event.target.value))}
                className={css({ flex: 1 })}
              />
              {Math.round(panelZoom * 100)}%
            </label>
          </summary>
          {popup ? (
            <div className={css({ display: 'flex', gap: '6px', margin: '6px 0' })}>
              <button type='button' onClick={() => popup.focus()} className={inputStyle}>
                Focus popup
              </button>
              <button type='button' onClick={() => popup.close()} className={inputStyle}>
                Close popup
              </button>
            </div>
          ) : (
            controls
          )}
        </details>
        <div
          aria-label='Resize panel'
          onPointerDown={event => {
            event.preventDefault()
            event.currentTarget.setPointerCapture(event.pointerId)
            panelResize.current = { startX: event.clientX, startY: event.clientY, ...panelSize }
          }}
          onPointerMove={event => {
            const start = panelResize.current
            if (!start) return
            // Pointer travel is in screen pixels; the panel is scaled, so divide to keep the grip under the finger.
            setPanelSize({
              width: Math.max(180, start.width + (event.clientX - start.startX) / panelZoom),
              height: Math.max(120, start.height + (event.clientY - start.startY) / panelZoom),
            })
          }}
          onPointerUp={() => {
            panelResize.current = null
          }}
          onPointerCancel={() => {
            panelResize.current = null
          }}
          className={css({
            position: 'absolute',
            right: 0,
            bottom: 0,
            width: '28px',
            height: '28px',
            cursor: 'nwse-resize',
            touchAction: 'none',
            backgroundColor: 'fgOverlay20',
            borderRadius: '6px 0 6px 0',
            _after: {
              content: '""',
              position: 'absolute',
              right: '6px',
              bottom: '6px',
              width: '10px',
              height: '10px',
              borderRight: '2px solid {colors.fg}',
              borderBottom: '2px solid {colors.fg}',
              opacity: 0.7,
            },
          })}
        />
      </div>
      {popup
        ? createPortal(
            <div
              className={css({
                padding: '8px 10px',
                fontSize: '11px',
                fontFamily: 'monospace',
                color: 'fg',
              })}
            >
              <h3 className={css({ margin: '0 0 6px', fontSize: '12px' })}>{heading}</h3>
              {controls}
            </div>,
            popup.document.body,
          )
        : null}
    </>
  )
}

export default PinnedCommandDebugPanel
```
