import { ReactNode, PointerEvent as ReactPointerEvent, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useSelector } from 'react-redux'
import { css } from '../../../styled-system/css'
import useBreakpoint from '../../hooks/useBreakpoint'
import storage from '../../util/storage'
import { DROPDOWN_Z_INDEX } from './Dropdown'
import MotionStepperControls from './DropdownMotionStepper'
import { DIALS_EVENT } from './dials'
import { isDialsSyncAvailable, publishDials, pullDials, subscribeDials } from './dialsSync'
import useMotionStepper, { DIALS_ROOT_ATTRIBUTE } from './useMotionStepper'

/*
 * TEMPORARY. A design-dials panel for tuning the Command Universe sort dropdown (see the design-dials skill). Every
 * control writes a --sort-dropdown-* custom property on <html> that Dropdown, DropdownRows, DropdownLight or
 * useSurfaceMask reads with the current design value as its fallback. Once the values are settled, bake them into
 * those fallbacks and delete this file, dials.ts, and its mount in AppComponent.
 *
 * Unlike the skill's default, this panel is mounted in every build except automated runs, not only in development:
 * it lives on a throwaway prototype branch and is tuned from the pull request's preview deployment.
 *
 * Built for tuning on a phone: closed, it is a floating button that can be dragged and flung out of the way; open,
 * it starts at 75% zoom, and its sliders scrub more finely the further the finger moves from the track.
 */

interface Control {
  /** The custom property this control writes. */
  name: string
  label: string
  /** Numeric controls get a scrub slider that writes `${value}${unit}`. Select controls choose from options. Text controls take any CSS value. */
  kind: 'number' | 'select' | 'text'
  min?: number
  max?: number
  step?: number
  unit?: string
  /** For select controls: the values to choose from, with a label each. */
  options?: { value: string; label: string }[]
  /**
   * Shown as the placeholder so the baked-in fallback is visible beside the override. Where the mobile and desktop
   * layouts differ it reads "mobile | desktop"; a note in parentheses is ignored when the slider reads it.
   */
  fallback: string
  /** One line on what the control does, shown under its label. */
  hint?: string
}

const OPENING_CONTROLS: Control[] = [
  {
    name: '--sort-dropdown-placement',
    label: 'opens',
    kind: 'select',
    options: [
      { value: 'around', label: 'around the selection' },
      { value: 'down', label: 'drops down from the button' },
      { value: 'down-fade', label: 'drops down, others fade in place' },
    ],
    fallback: 'down',
    hint: 'Around: the selected item stays on the button. Down: every item opens in the same place, the others spreading out from the button. Fade in place: only the selected item moves.',
  },
]

const MASK_CONTROLS: Control[] = [
  {
    name: '--sort-dropdown-scrim-opacity',
    label: 'screen dim',
    kind: 'number',
    min: 0,
    max: 1,
    step: 0.01,
    fallback: '0',
    hint: 'A dark fill over the whole screen. 0 = none, 1 = black.',
  },
  {
    name: '--sort-dropdown-content-opacity',
    label: 'Command Universe content',
    kind: 'number',
    min: 0,
    max: 1,
    step: 0.01,
    fallback: '1',
    hint: 'How visible the commands behind the menu stay. 1 = untouched.',
  },
  {
    name: '--sort-dropdown-mask-strength',
    label: 'mask strength',
    kind: 'number',
    min: 0,
    max: 1,
    step: 0.01,
    fallback: '0.9',
    hint: 'How hidden the content is at the centre of the light. 0 = mask off, 1 = fully hidden.',
  },
  {
    name: '--sort-dropdown-mask-size',
    label: 'mask size',
    kind: 'number',
    min: 80,
    max: 600,
    step: 1,
    unit: 'px',
    fallback: '287px',
    hint: 'The ellipse’s width at a glow spread of 1; it also grows with the spread (Figma: ~545px at 1.9).',
  },
  {
    name: '--sort-dropdown-mask-aspect',
    label: 'mask aspect',
    kind: 'number',
    min: 0.5,
    max: 2,
    step: 0.01,
    fallback: '1.11',
    hint: 'Height ÷ width. Above 1 = taller than wide.',
  },
  {
    name: '--sort-dropdown-mask-core',
    label: 'fully hidden core',
    kind: 'number',
    min: 0,
    max: 90,
    step: 1,
    unit: '%',
    fallback: '40%',
    hint: 'How much of the ellipse, from the centre, stays at full strength before fading.',
  },
  {
    name: '--sort-dropdown-mask-falloff',
    label: 'fade ends at',
    kind: 'number',
    min: 30,
    max: 150,
    step: 1,
    unit: '%',
    fallback: '100%',
    hint: 'Where the content is fully visible again, as % of the ellipse. Lower = a tighter, harder edge.',
  },
  {
    name: '--sort-dropdown-mask-offset-x',
    label: 'mask offset, horizontal',
    kind: 'number',
    min: -200,
    max: 200,
    step: 1,
    unit: 'px',
    fallback: '0px',
    hint: 'Moves the mask from the light’s centre. Positive = right.',
  },
  {
    name: '--sort-dropdown-mask-offset-y',
    label: 'mask offset, vertical',
    kind: 'number',
    min: -200,
    max: 200,
    step: 1,
    unit: 'px',
    fallback: '0px',
    hint: 'Positive = down.',
  },
]

const SURFACE_LIGHT_CONTROLS: Control[] = [
  {
    name: '--sort-dropdown-room-light',
    label: 'Command Universe light',
    kind: 'number',
    min: 0,
    max: 1,
    step: 0.01,
    fallback: '1',
    hint: 'The dialog’s own room light, top light and selection glow while the menu is open. 1 = stays lit, 0 = off.',
  },
  {
    name: '--sort-dropdown-glass-blur',
    label: 'glass blur',
    kind: 'number',
    min: 0,
    max: 1,
    step: 0.01,
    fallback: '1',
    hint: 'The blur behind the glass. Below 1, the editor shows through unblurred.',
  },
]

const GLOW_CONTROLS: Control[] = [
  {
    name: '--sort-dropdown-glow-scope',
    label: 'laid out',
    kind: 'select',
    options: [
      { value: 'menu', label: 'around the options' },
      { value: 'surface', label: 'across the dialog' },
    ],
    fallback: 'menu',
  },
  {
    name: '--sort-dropdown-glow-spread',
    label: 'spread',
    kind: 'number',
    min: 0.5,
    max: 3,
    step: 0.05,
    fallback: '1.9',
    hint: 'Scales the whole glow about its centre. Below 1 = tight, above 1 = diffuse.',
  },
  {
    name: '--sort-dropdown-glow-intensity',
    label: 'intensity',
    kind: 'number',
    min: 0,
    max: 2,
    step: 0.05,
    fallback: '1.2',
  },
]

const ROWS_CONTROLS: Control[] = [
  {
    name: '--sort-dropdown-font-size',
    label: 'option font size',
    kind: 'number',
    min: 12,
    max: 21,
    step: 0.25,
    unit: 'px',
    fallback: '15.5px | 17px',
  },
  {
    name: '--sort-dropdown-heading-font-size',
    label: '“Sort by…” font size',
    kind: 'number',
    min: 13,
    max: 22,
    step: 0.25,
    unit: 'px',
    fallback: '17.5px',
  },
  {
    name: '--sort-dropdown-row-padding',
    label: 'space between options',
    kind: 'number',
    min: 0,
    max: 10,
    step: 0.5,
    unit: 'px',
    fallback: '2.5px | 4px',
    hint: 'Padding above and below each option.',
  },
  {
    name: '--sort-dropdown-heading-gap',
    label: 'space under “Sort by…”',
    kind: 'number',
    min: 0,
    max: 20,
    step: 0.5,
    unit: 'px',
    fallback: '6px',
  },
  {
    name: '--sort-dropdown-separator-space',
    label: 'space around the separator',
    kind: 'number',
    min: 0,
    max: 24,
    step: 0.5,
    unit: 'px',
    fallback: '8px',
    hint: 'Between the sort options and the actions, above and below the line.',
  },
  {
    name: '--sort-dropdown-label-icon-gap',
    label: 'space between label and icon',
    kind: 'number',
    min: 0,
    max: 20,
    step: 0.5,
    unit: 'px',
    fallback: '10px',
  },
]

/** One collapsible group of controls. */
interface Section {
  /** Stable key for the persisted open state. */
  id: string
  title: string
  /** Shown beside the title. */
  note?: string
  controls: Control[]
}

/** The panel's sections in display order. */
const SECTIONS: Section[] = [
  { id: 'opening', title: 'Opening', controls: OPENING_CONTROLS },
  { id: 'mask', title: 'Mask over the screen', note: 'modal ↔ local', controls: MASK_CONTROLS },
  { id: 'surfaceLight', title: 'Command Universe lighting', controls: SURFACE_LIGHT_CONTROLS },
  { id: 'glow', title: 'Menu glow', controls: GLOW_CONTROLS },
  { id: 'rows', title: 'Type and spacing', controls: ROWS_CONTROLS },
  { id: 'motion', title: 'Motion', note: 'freeze & step frames', controls: [] },
  { id: 'paste', title: 'Overrides to paste back', note: 'for baking in', controls: [] },
]

const ALL_CONTROLS = SECTIONS.flatMap(section => section.controls)

const OPEN_SECTIONS_KEY = 'sortDropdownDials.openSections'
const VALUES_KEY = 'sortDropdownDials.values'
const AUTO_SYNC_KEY = 'sortDropdownDials.autoSync'
const FAB_KEY = 'sortDropdownDials.fab'

/** Diameter of the floating button (px). */
const FAB_SIZE = 44
/** Gap kept between the floating button or panel and the edges of the viewport, inside the safe areas (px). */
const EDGE = 8
/** Unscaled width of the open panel (px); at the default 75% zoom it takes 225px of screen. */
const PANEL_WIDTH = 300

/**
 * Scrub rates by how far the finger has moved from the track, in screen pixels, like iOS's video scrubbing: within
 * the first band the slider tracks the finger; each band further away moves the value more slowly and lets it land
 * on finer steps.
 */
const SCRUB_BANDS: { distance: number; rate: number; label: string }[] = [
  { distance: 0, rate: 1, label: '' },
  { distance: 40, rate: 0.5, label: '½ speed' },
  { distance: 90, rate: 0.25, label: '¼ speed' },
  { distance: 140, rate: 0.1, label: 'fine' },
]

/** Reads a persisted JSON value; falls back when it is missing or malformed. */
const readJson = <T,>(key: string, fallback: T, isValid: (value: unknown) => value is T): T => {
  try {
    const parsed: unknown = JSON.parse(storage.getItem(key) ?? 'null')
    return isValid(parsed) ? parsed : fallback
  } catch {
    return fallback
  }
}

/** Reads the persisted set of open section ids; every section starts open, so the dials are visible at first. */
const readOpenSections = (): string[] =>
  readJson(
    OPEN_SECTIONS_KEY,
    SECTIONS.map(section => section.id),
    (value): value is string[] => Array.isArray(value) && value.every(id => typeof id === 'string'),
  )

/** Reads the persisted overrides, so a reload of the preview keeps the values being tuned. */
const readValues = (): Record<string, string> =>
  readJson(
    VALUES_KEY,
    {},
    (value): value is Record<string, string> =>
      typeof value === 'object' && value !== null && Object.values(value).every(v => typeof v === 'string'),
  )

/** Reads the floating button's persisted position; defaults to the bottom-left corner. */
const readFabPosition = (): { x: number; y: number } =>
  readJson(
    FAB_KEY,
    { x: EDGE, y: window.innerHeight - FAB_SIZE - EDGE * 8 },
    (value): value is { x: number; y: number } =>
      typeof value === 'object' &&
      value !== null &&
      typeof (value as { x: unknown }).x === 'number' &&
      typeof (value as { y: unknown }).y === 'number',
  )

/** The slider's starting value when the control has no override: the layout's fallback, ignoring any note. */
const fallbackNumber = (control: Control, isDesktop: boolean): number => {
  const parts = control.fallback.split('|')
  const part = parts.length > 1 ? parts[isDesktop ? 1 : 0] : parts[0]
  return parseFloat(part)
}

/** Number of decimals needed to show a step exactly (0.25 → 2, 0.025 → 3), capped so scrubbed values stay readable. */
const decimalsOf = (step: number) => Math.min(4, (step.toFixed(6).replace(/0+$/, '').split('.')[1] ?? '').length)

/** The viewport's safe-area insets, read from a probe element, since env() can't be read from JavaScript directly. */
const readSafeArea = () => {
  const probe = document.createElement('div')
  probe.style.cssText =
    'position:fixed;visibility:hidden;pointer-events:none;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)'
  document.body.appendChild(probe)
  const cs = getComputedStyle(probe)
  const insets = {
    top: parseFloat(cs.paddingTop) || 0,
    right: parseFloat(cs.paddingRight) || 0,
    bottom: parseFloat(cs.paddingBottom) || 0,
    left: parseFloat(cs.paddingLeft) || 0,
  }
  probe.remove()
  return insets
}

/** Keeps a point inside the viewport and its safe areas, for a box of the given size. */
const clampToViewport = (x: number, y: number, width: number, height: number) => {
  const safe = readSafeArea()
  return {
    x: Math.min(Math.max(x, safe.left + EDGE), window.innerWidth - safe.right - EDGE - width),
    y: Math.min(Math.max(y, safe.top + EDGE), window.innerHeight - safe.bottom - EDGE - height),
  }
}

/**
 * Stops a press inside the panel or button from reaching document-level listeners, which would close the Command
 * Universe or the dropdown.
 */
const stopPress = {
  onMouseDown: (event: React.SyntheticEvent) => event.stopPropagation(),
  onTouchStart: (event: React.SyntheticEvent) => event.stopPropagation(),
  onPointerDown: (event: React.SyntheticEvent) => event.stopPropagation(),
  onClick: (event: React.SyntheticEvent) => event.stopPropagation(),
}

/** Inline 24×24 stroke icons for the icon buttons. */
const ICONS = {
  // Two arrows chasing each other: send these values to every device on the dev server.
  sync: (
    <>
      <path d='M20 11a8 8 0 0 0-14.3-4.9L4 8' />
      <path d='M4 4v4h4' />
      <path d='M4 13a8 8 0 0 0 14.3 4.9L20 16' />
      <path d='M20 20v-4h-4' />
    </>
  ),
  // A chain link: keep every device in step as values change.
  autoSync: (
    <>
      <path d='M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1' />
      <path d='M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1' />
    </>
  ),
  copy: (
    <>
      <rect x='9' y='9' width='11' height='11' rx='2' />
      <path d='M5 15V6a2 2 0 0 1 2-2h8' />
    </>
  ),
  reset: (
    <>
      <path d='M4 12a8 8 0 1 0 2.4-5.7' />
      <path d='M4 4v4h4' />
    </>
  ),
  popup: (
    <>
      <path d='M14 4h6v6' />
      <path d='M20 4l-8 8' />
      <path d='M11 5H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-5' />
    </>
  ),
  focus: (
    <>
      <rect x='4' y='5' width='16' height='14' rx='2' />
      <path d='M4 9h16' />
    </>
  ),
  expand: (
    <>
      <path d='M7 6l5 5 5-5' />
      <path d='M7 13l5 5 5-5' />
    </>
  ),
  collapse: (
    <>
      <path d='M7 18l5-5 5 5' />
      <path d='M7 11l5-5 5 5' />
    </>
  ),
  close: <path d='M6 6l12 12M18 6L6 18' />,
  dials: (
    <>
      <path d='M5 7h14M5 12h14M5 17h14' />
      <circle cx='9' cy='7' r='2' fill='currentColor' />
      <circle cx='15' cy='12' r='2' fill='currentColor' />
      <circle cx='8' cy='17' r='2' fill='currentColor' />
    </>
  ),
}

/** A square icon-only button with a tooltip and an accessible label. */
const IconButton = ({
  icon,
  label,
  onClick,
  disabled,
  pressed,
}: {
  icon: keyof typeof ICONS
  label: string
  onClick: () => void
  disabled?: boolean
  /** For toggles: whether the toggle is on. Highlights the button and sets aria-pressed. */
  pressed?: boolean
}) => (
  <button
    type='button'
    aria-label={label}
    aria-pressed={pressed}
    title={label}
    onClick={onClick}
    disabled={disabled}
    style={
      pressed ? { backgroundColor: 'rgba(120, 105, 225, 0.45)', borderColor: 'rgba(170, 160, 255, 0.8)' } : undefined
    }
    className={css({
      flex: 'none',
      width: '36px',
      height: '36px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 0,
      color: 'fg',
      backgroundColor: 'fgOverlay10',
      border: '1px solid {colors.fgOverlay20}',
      borderRadius: '8px',
      cursor: 'pointer',
      _disabled: { opacity: 0.35, cursor: 'default' },
    })}
  >
    <svg
      width='20'
      height='20'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth={1.8}
      strokeLinecap='round'
      strokeLinejoin='round'
    >
      {ICONS[icon]}
    </svg>
  </button>
)

const inputStyle = css({
  width: '100%',
  minWidth: 0,
  boxSizing: 'border-box',
  fontSize: '13px',
  fontFamily: 'monospace',
  padding: '6px 8px',
  backgroundColor: 'fgOverlay10',
  color: 'fg',
  border: '1px solid {colors.fgOverlay20}',
  borderRadius: '6px',
})

/**
 * A pointer-driven slider with precision scrubbing. Dragging along the track moves the value at the normal rate;
 * moving the finger up or down away from the track slows it (see SCRUB_BANDS) and lets it land on finer steps, down
 * to a tenth of the control's step. A tap on the track jumps the value there. Movement is applied incrementally, so
 * changing band mid-drag never makes the value jump.
 */
const ScrubSlider = ({
  value,
  min,
  max,
  step,
  onChange,
}: {
  value: number
  min: number
  max: number
  step: number
  onChange: (value: number, decimals: number) => void
}) => {
  const trackRef = useRef<HTMLDivElement>(null)
  // The drag in progress: the last pointer x, and the unrounded value it has accumulated.
  const drag = useRef<{ lastX: number; raw: number } | null>(null)
  const [band, setBand] = useState<(typeof SCRUB_BANDS)[number] | null>(null)
  const fraction = Math.min(1, Math.max(0, (value - min) / (max - min)))

  /** Rounds a value to the step allowed at a scrub rate, and clamps it to the range. */
  const settle = (raw: number, rate: number) => {
    const fine = rate >= 1 ? step : rate >= 0.5 ? step / 2 : rate >= 0.25 ? step / 4 : step / 10
    const decimals = decimalsOf(fine)
    const rounded = Math.min(max, Math.max(min, Math.round(raw / fine) * fine))
    return { value: parseFloat(rounded.toFixed(decimals)), decimals }
  }

  /** The band for a pointer, by its vertical distance from the track's centre line (screen px). */
  const bandFor = (clientY: number) => {
    const rect = trackRef.current!.getBoundingClientRect()
    const distance = Math.abs(clientY - (rect.top + rect.height / 2))
    return [...SCRUB_BANDS].reverse().find(b => distance >= b.distance) ?? SCRUB_BANDS[0]
  }

  /** Jumps to where the track was pressed, then follows the drag from there. */
  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)
    const rect = trackRef.current!.getBoundingClientRect()
    const raw = min + ((event.clientX - rect.left) / rect.width) * (max - min)
    const next = settle(raw, 1)
    drag.current = { lastX: event.clientX, raw: next.value }
    setBand(SCRUB_BANDS[0])
    onChange(next.value, next.decimals)
  }

  /** Moves the value by the pointer's horizontal travel, scaled by the band it is in. */
  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const current = drag.current
    if (!current) return
    const rect = trackRef.current!.getBoundingClientRect()
    const nextBand = bandFor(event.clientY)
    if (nextBand !== band) setBand(nextBand)
    current.raw += ((event.clientX - current.lastX) / rect.width) * (max - min) * nextBand.rate
    current.raw = Math.min(max, Math.max(min, current.raw))
    current.lastX = event.clientX
    const next = settle(current.raw, nextBand.rate)
    if (next.value !== value) onChange(next.value, next.decimals)
  }

  /** Ends the drag. */
  const onPointerEnd = () => {
    drag.current = null
    setBand(null)
  }

  return (
    <div
      ref={trackRef}
      role='slider'
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
      className={css({
        position: 'relative',
        height: '40px',
        cursor: 'ew-resize',
        // The page must not scroll or zoom while a finger scrubs, including when it strays up or down.
        touchAction: 'none',
        userSelect: 'none',
      })}
    >
      {/* The visible track, centred in the taller hit area. */}
      <div
        className={css({
          position: 'absolute',
          left: 0,
          right: 0,
          top: '50%',
          height: '6px',
          marginTop: '-3px',
          borderRadius: '3px',
          backgroundColor: 'fgOverlay20',
          overflow: 'hidden',
        })}
      >
        <div
          className={css({ height: '100%', backgroundColor: 'vividHighlight' })}
          style={{ width: `${fraction * 100}%` }}
        />
      </div>
      {/* Thumb. */}
      <div
        className={css({
          position: 'absolute',
          top: '50%',
          width: '22px',
          height: '22px',
          marginTop: '-11px',
          marginLeft: '-11px',
          borderRadius: '50%',
          backgroundColor: 'fg',
          boxShadow: '0 1px 4px rgba(0, 0, 0, 0.5)',
          pointerEvents: 'none',
        })}
        style={{ left: `${fraction * 100}%` }}
      />
      {/* While scrubbing slower than normal, say how much slower. */}
      {band?.label ? (
        <div
          className={css({
            position: 'absolute',
            bottom: '100%',
            padding: '2px 6px',
            borderRadius: '4px',
            fontSize: '12px',
            whiteSpace: 'nowrap',
            backgroundColor: 'vividHighlight',
            color: 'bg',
            transform: 'translateX(-50%)',
            pointerEvents: 'none',
          })}
          style={{ left: `${fraction * 100}%` }}
        >
          {band.label} · {value}
        </div>
      ) : null}
    </div>
  )
}

/** One labelled control: a scrub slider or a choice, plus a free-form text input for the same custom property. */
const ControlRow = ({
  control,
  value,
  isDesktop,
  onChange,
}: {
  control: Control
  value: string
  isDesktop: boolean
  onChange: (value: string) => void
}) => {
  const parsed = parseFloat(value)
  const numeric = Number.isFinite(parsed) ? parsed : fallbackNumber(control, isDesktop)
  return (
    // minmax(0, 1fr): the long property names would otherwise widen the column past the panel.
    <div className={css({ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: '2px', marginBottom: '10px' })}>
      <span className={css({ opacity: 0.9 })}>
        {control.label} <code className={css({ opacity: 0.45, wordBreak: 'break-all' })}>{control.name}</code>
      </span>
      {control.hint ? <span className={css({ opacity: 0.55 })}>{control.hint}</span> : null}
      {control.kind === 'select' ? (
        <select
          value={value || control.fallback}
          onChange={event => onChange(event.target.value)}
          className={inputStyle}
        >
          {control.options?.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : null}
      {control.kind === 'number' ? (
        <ScrubSlider
          value={numeric}
          min={control.min ?? 0}
          max={control.max ?? 1}
          step={control.step ?? 0.01}
          onChange={(next, decimals) =>
            onChange(`${next.toFixed(decimals).replace(/\.?0+$/, '') || '0'}${control.unit ?? ''}`)
          }
        />
      ) : null}
      {control.kind !== 'select' ? (
        <input
          type='text'
          value={value}
          placeholder={control.fallback}
          onChange={event => onChange(event.target.value)}
          className={inputStyle}
          // The app's global input styles give text inputs a 300px min-width, wider than the panel.
          style={{ minWidth: 0 }}
        />
      ) : null}
    </div>
  )
}

/**
 * One collapsible section. The summary shows how many of its properties are overridden so a tweak can be found again
 * while collapsed, and a reset icon clears just this section's overrides.
 */
const CollapsibleSection = ({
  section,
  isOpen,
  onToggle,
  values,
  setValues,
  isDesktop,
  children,
}: {
  section: Section
  isOpen: boolean
  onToggle: (open: boolean) => void
  values: Record<string, string>
  setValues: (update: (previous: Record<string, string>) => Record<string, string>) => void
  isDesktop: boolean
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
        margin: '8px 0',
        border: '1px solid {colors.fgOverlay20}',
        borderRadius: '6px',
      })}
    >
      <summary
        className={css({
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          minHeight: '40px',
          padding: '4px 8px',
          cursor: 'pointer',
          fontWeight: 700,
          backgroundColor: 'fgOverlay10',
          borderRadius: '5px',
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
              padding: '0 6px',
              borderRadius: '8px',
              fontWeight: 400,
              whiteSpace: 'nowrap',
              backgroundColor: 'vividHighlight',
              color: 'bg',
            })}
          >
            {overridden} set
          </span>
        ) : null}
      </summary>
      <div className={css({ padding: '8px 8px 4px' })}>
        {children}
        {section.controls.map(control => (
          <ControlRow
            key={control.name}
            control={control}
            value={values[control.name] ?? ''}
            isDesktop={isDesktop}
            onChange={value => setValues(previous => ({ ...previous, [control.name]: value }))}
          />
        ))}
        {section.controls.length ? (
          <div className={css({ display: 'flex', justifyContent: 'flex-end', marginBottom: '4px' })}>
            <IconButton icon='reset' label='Reset this section' onClick={resetSection} disabled={!overridden} />
          </div>
        ) : null}
      </div>
    </details>
  )
}

/**
 * The closed panel: a round button that can be dragged and flung around the screen, coasting to a stop inside the
 * viewport. A press that barely moves is a tap and opens the panel; anything more is a drag and never opens it.
 */
const DialsFab = ({
  position,
  onMove,
  onOpen,
  overridden,
}: {
  position: { x: number; y: number }
  onMove: (position: { x: number; y: number }) => void
  onOpen: () => void
  /** How many overrides are set, shown as a badge. */
  overridden: number
}) => {
  // The press in progress: where it started, the button's position then, whether it has become a drag, and the
  // recent samples used to measure the fling's velocity.
  const press = useRef<{
    startX: number
    startY: number
    origin: { x: number; y: number }
    dragging: boolean
    samples: { x: number; y: number; t: number }[]
  } | null>(null)
  const frame = useRef(0)

  useEffect(() => () => cancelAnimationFrame(frame.current), [])

  /** Coasts from a position with a velocity (px/ms), slowing by friction and stopping at the viewport's edges. */
  const fling = (from: { x: number; y: number }, velocity: { x: number; y: number }) => {
    let { x, y } = from
    let vx = velocity.x
    let vy = velocity.y
    let last = performance.now()
    /** Advances the coast by one frame. */
    const step = (now: number) => {
      const dt = Math.min(32, now - last)
      last = now
      x += vx * dt
      y += vy * dt
      const clamped = clampToViewport(x, y, FAB_SIZE, FAB_SIZE)
      if (clamped.x !== x) vx = 0
      if (clamped.y !== y) vy = 0
      x = clamped.x
      y = clamped.y
      // Friction tuned per 16ms frame, scaled to the real frame time.
      const friction = Math.pow(0.92, dt / 16)
      vx *= friction
      vy *= friction
      onMove({ x, y })
      if (Math.hypot(vx, vy) > 0.02) frame.current = requestAnimationFrame(step)
      else storage.setItem(FAB_KEY, JSON.stringify({ x, y }))
    }
    frame.current = requestAnimationFrame(step)
  }

  return (
    <button
      type='button'
      aria-label='Sort dropdown dials'
      {...{ [DIALS_ROOT_ATTRIBUTE]: '' }}
      title='Sort dropdown dials (drag to move, tap to open)'
      {...stopPress}
      onPointerDown={event => {
        event.stopPropagation()
        cancelAnimationFrame(frame.current)
        event.currentTarget.setPointerCapture(event.pointerId)
        press.current = {
          startX: event.clientX,
          startY: event.clientY,
          origin: position,
          dragging: false,
          samples: [{ x: event.clientX, y: event.clientY, t: event.timeStamp }],
        }
      }}
      onPointerMove={event => {
        const current = press.current
        if (!current) return
        const dx = event.clientX - current.startX
        const dy = event.clientY - current.startY
        if (!current.dragging && Math.hypot(dx, dy) < 6) return
        current.dragging = true
        current.samples = [
          ...current.samples.filter(s => event.timeStamp - s.t < 100),
          { x: event.clientX, y: event.clientY, t: event.timeStamp },
        ]
        onMove(clampToViewport(current.origin.x + dx, current.origin.y + dy, FAB_SIZE, FAB_SIZE))
      }}
      onPointerUp={event => {
        const current = press.current
        press.current = null
        if (!current) return
        if (!current.dragging) {
          onOpen()
          return
        }
        // Velocity over the last ~100ms of the drag.
        const first = current.samples[0]
        const dt = Math.max(1, event.timeStamp - first.t)
        const velocity = { x: (event.clientX - first.x) / dt, y: (event.clientY - first.y) / dt }
        fling(position, velocity)
      }}
      onPointerCancel={() => {
        press.current = null
        storage.setItem(FAB_KEY, JSON.stringify(position))
      }}
      className={css({
        position: 'fixed',
        width: '44px',
        height: '44px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 0,
        borderRadius: '50%',
        color: 'fg',
        backgroundColor: 'bgOverlay80',
        border: '1px solid {colors.fgOverlay20}',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.5)',
        cursor: 'grab',
        touchAction: 'none',
        userSelect: 'none',
      })}
      style={{ left: position.x, top: position.y, zIndex: DROPDOWN_Z_INDEX + 1 }}
    >
      <svg
        width='22'
        height='22'
        viewBox='0 0 24 24'
        fill='none'
        stroke='currentColor'
        strokeWidth={1.8}
        strokeLinecap='round'
      >
        {ICONS.dials}
      </svg>
      {overridden ? (
        <span
          className={css({
            position: 'absolute',
            top: '-4px',
            right: '-4px',
            minWidth: '18px',
            height: '18px',
            padding: '0 4px',
            borderRadius: '9px',
            fontSize: '11px',
            fontFamily: 'monospace',
            lineHeight: '18px',
            backgroundColor: 'vividHighlight',
            color: 'bg',
          })}
        >
          {overridden}
        </span>
      ) : null}
    </button>
  )
}

/** The design-dials panel for the sort dropdown: a floating button over the Command Universe that opens the dials, inline or in a popup window. */
const DropdownDebugPanel = () => {
  // The frame stepper's state lives here, in the component that stays mounted, so freezing works while collapsed.
  const motion = useMotionStepper()
  const [values, setValues] = useState<Record<string, string>>(readValues)
  const [openSections, setOpenSections] = useState<string[]>(readOpenSections)
  const [popup, setPopup] = useState<Window | null>(null)
  // The sort dropdown lives in the Command Universe, so the button and panel only show while it is open. The popup
  // and the overrides stay, so tuning can continue across closing and reopening it.
  const isCommandUniverseOpen = useSelector(state => state.showMobileCommandUniverse)
  // The Command Universe switches to its desktop layout at md (400px); each layout is tuned separately.
  const isDesktop = useBreakpoint('md')
  const [fabPosition, setFabPosition] = useState(readFabPosition)
  const [expanded, setExpanded] = useState(false)
  const [panelZoom, setPanelZoom] = useState(0.75)
  const [panelHeight, setPanelHeight] = useState(() => Math.round(window.innerHeight * 0.8))
  const panelResize = useRef<{ startY: number; height: number } | null>(null)
  // Device sync over the dev server (dialsSync). Unavailable, and hidden, in production builds and previews.
  const syncAvailable = isDialsSyncAvailable()
  // Auto-sync: send every change to the other devices, and pull the latest values on load.
  const [autoSync, setAutoSyncState] = useState(() => storage.getItem(AUTO_SYNC_KEY) === 'true')
  // A short note on the last sync, shown under the toolbar.
  const [syncStatus, setSyncStatus] = useState('')
  // True while applying values received from another device, so they aren't sent straight back out.
  const applyingRemote = useRef(false)
  // False until the first render's values have been seen, so loading the panel doesn't send its stored values.
  const hasLoaded = useRef(false)

  /** Expands or collapses one section and remembers the choice for the next reload. */
  const toggleSection = (id: string, open: boolean) =>
    setOpenSections(previous => {
      const next = open ? [...new Set([...previous, id])] : previous.filter(section => section !== id)
      storage.setItem(OPEN_SECTIONS_KEY, JSON.stringify(next))
      return next
    })

  // Write the overrides to <html>, persist them, and tell the dropdown to re-read and re-measure.
  useEffect(() => {
    const root = document.documentElement.style
    ALL_CONTROLS.forEach(control => {
      const value = values[control.name]
      if (value) root.setProperty(control.name, value)
      else root.removeProperty(control.name)
    })
    storage.setItem(VALUES_KEY, JSON.stringify(values))
    window.dispatchEvent(new Event(DIALS_EVENT))
  }, [values])

  // Apply values sent from other devices. Always on where sync is available: a device receives what another sends,
  // whether or not it is auto-syncing itself.
  useEffect(() => {
    if (!syncAvailable) return
    return subscribeDials((remote, meta) => {
      applyingRemote.current = true
      setValues(remote)
      setSyncStatus(`Received from another device · ${new Date(meta.at).toLocaleTimeString()}`)
    })
  }, [syncAvailable])

  // Auto-sync: pull the latest values once on load, then send every local change.
  useEffect(() => {
    if (syncAvailable && autoSync) pullDials()
  }, [syncAvailable, autoSync])
  useEffect(() => {
    // On load, pull rather than send: this device's stored values may be older than what is on the server.
    if (!hasLoaded.current) {
      hasLoaded.current = true
      return
    }
    if (applyingRemote.current) {
      applyingRemote.current = false
      return
    }
    if (syncAvailable && autoSync) publishDials(values)
  }, [values, syncAvailable, autoSync])

  /** Turns auto-sync on or off, and remembers the choice for the next reload. */
  const setAutoSync = (on: boolean) => {
    storage.setItem(AUTO_SYNC_KEY, String(on))
    setAutoSyncState(on)
    setSyncStatus(on ? 'Auto-sync on: changes go to every device on this dev server' : 'Auto-sync off')
  }

  /** Sends this device's values to every device on the dev server, once. */
  const syncNow = () => {
    publishDials(values)
    setSyncStatus(`Sent to other devices · ${new Date().toLocaleTimeString()}`)
  }

  // Clear the overrides only when the panel unmounts.
  useEffect(
    () => () => {
      ALL_CONTROLS.forEach(control => document.documentElement.style.removeProperty(control.name))
      window.dispatchEvent(new Event(DIALS_EVENT))
    },
    [],
  )

  // Keep the floating button on screen when the viewport changes (rotation, resizing the window).
  useLayoutEffect(() => {
    /** Pulls the button back inside the viewport. */
    const onResize = () => setFabPosition(position => clampToViewport(position.x, position.y, FAB_SIZE, FAB_SIZE))
    onResize()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
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

  /**
   * Opens a popup and mirrors this document's stylesheets and root attributes into it so the portaled controls keep
   * their Panda classes and theme tokens. The component code still runs in this window, so state, the custom
   * properties, and matchMedia all refer to the main document. Styles are copied once; reopen after a style change.
   */
  const openPopup = () => {
    const win = window.open('', 'sortDropdownDials', 'popup,width=420,height=900')
    if (!win) return
    win.document.head.innerHTML = ''
    win.document.body.innerHTML = ''
    win.document.title = 'Sort dropdown dials'
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

  const layout = isDesktop ? 'desktop (≥ 400px)' : 'mobile (< 400px)'
  const set = Object.fromEntries(Object.entries(values).filter(([, value]) => value))
  const overriddenCount = Object.keys(set).length
  // Every override grouped by section with the fallback it replaces, so the list can be pasted into the pull request
  // and each value located in the code it belongs to.
  const overrideRows = SECTIONS.flatMap(section => {
    const rows = section.controls
      .filter(control => values[control.name])
      .map(control => `${control.name}: ${values[control.name]};  /* was ${control.fallback} */`)
    return rows.length ? [`// ${section.title}`, ...rows] : []
  })
  const pasteText = [
    `// sort dropdown overrides · ${layout} · ${window.innerWidth}×${window.innerHeight}`,
    ...(overrideRows.length ? overrideRows : ['// no overrides yet']),
  ].join('\n')
  /** Writes to the clipboard of the window holding the controls; the click's user activation belongs to that window. */
  const copy = (text: string) => (popup ?? window).navigator.clipboard.writeText(text)

  const toolbar = (
    <div className={css({ display: 'flex', flexWrap: 'wrap', gap: '6px', margin: '8px 0' })}>
      <IconButton icon='copy' label='Copy overrides' onClick={() => copy(pasteText)} />
      <IconButton icon='reset' label='Reset all overrides' onClick={() => setValues({})} disabled={!overriddenCount} />
      <IconButton
        icon='popup'
        label={popup ? 'Close popup' : 'Open in popup'}
        onClick={() => (popup ? popup.close() : openPopup())}
      />
      <IconButton icon='expand' label='Expand all sections' onClick={() => setAllSections(true)} />
      <IconButton icon='collapse' label='Collapse all sections' onClick={() => setAllSections(false)} />
      {syncAvailable ? (
        <>
          <IconButton icon='sync' label='Send these values to every device on the dev server' onClick={syncNow} />
          <IconButton
            icon='autoSync'
            label={autoSync ? 'Auto-sync on (tap to turn off)' : 'Auto-sync off (tap to turn on)'}
            onClick={() => setAutoSync(!autoSync)}
            pressed={autoSync}
          />
        </>
      ) : null}
      {syncStatus ? <p className={css({ flexBasis: '100%', margin: 0, opacity: 0.6 })}>{syncStatus}</p> : null}
    </div>
  )

  const controls = (
    <>
      {toolbar}
      <p className={css({ margin: '4px 0', opacity: 0.6 })}>
        Open the sort menu, then drag. Move your finger up or down off a slider to scrub finely. Empty = current design
        value (mobile | desktop where they differ).
      </p>
      {SECTIONS.map(section => (
        <CollapsibleSection
          key={section.id}
          section={section}
          isOpen={openSections.includes(section.id)}
          onToggle={open => toggleSection(section.id, open)}
          values={values}
          setValues={setValues}
          isDesktop={isDesktop}
        >
          {section.id === 'motion' ? <MotionStepperControls motion={motion} Slider={ScrubSlider} /> : null}
          {section.id === 'paste' ? (
            <>
              <pre
                className={css({
                  margin: '0 0 6px',
                  padding: '6px 8px',
                  fontSize: '12px',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all',
                  userSelect: 'text',
                  backgroundColor: 'fgOverlay10',
                  border: '1px solid {colors.fgOverlay20}',
                  borderRadius: '6px',
                })}
              >
                {pasteText}
              </pre>
              <IconButton icon='copy' label='Copy as JSON' onClick={() => copy(JSON.stringify(set, null, 2))} />
            </>
          ) : null}
        </CollapsibleSection>
      ))}
    </>
  )

  // The open panel sits beside the button: on whichever side has more room, its top level with the button's, and
  // pulled inside the viewport. Its size on screen is its unscaled size times the zoom.
  const screenWidth = PANEL_WIDTH * panelZoom
  const screenHeight = Math.min(panelHeight * panelZoom, window.innerHeight - EDGE * 2)
  const openLeft = fabPosition.x + FAB_SIZE / 2 > window.innerWidth / 2
  const panelAt = clampToViewport(
    openLeft ? fabPosition.x + FAB_SIZE - screenWidth : fabPosition.x,
    fabPosition.y,
    screenWidth,
    screenHeight,
  )

  return (
    <>
      {isCommandUniverseOpen && !expanded ? (
        <DialsFab
          position={fabPosition}
          onMove={setFabPosition}
          onOpen={() => setExpanded(true)}
          overridden={overriddenCount}
        />
      ) : null}
      {isCommandUniverseOpen && expanded ? (
        <div
          {...stopPress}
          {...{ [DIALS_ROOT_ATTRIBUTE]: '' }}
          className={css({
            position: 'fixed',
            transformOrigin: 'top left',
            fontSize: '13px',
            fontFamily: 'monospace',
            color: 'fg',
          })}
          // Above the dropdown's layers and its tap catcher, which sit at the dialog's z-index.
          style={{
            zIndex: DROPDOWN_Z_INDEX + 1,
            left: panelAt.x,
            top: panelAt.y,
            width: PANEL_WIDTH,
            height: screenHeight / panelZoom,
            transform: `scale(${panelZoom})`,
          }}
        >
          <div
            className={css({
              boxSizing: 'border-box',
              width: '100%',
              height: '100%',
              overflowY: 'auto',
              overscrollBehavior: 'contain',
              padding: '8px 10px',
              backgroundColor: 'bgOverlay80',
              // Blur what's behind, so the menu's own text under the panel doesn't compete with the controls.
              backdropFilter: 'blur(14px)',
              border: '1px solid {colors.fgOverlay20}',
              borderRadius: '10px',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)',
              touchAction: 'pan-y',
            })}
          >
            <div className={css({ display: 'flex', alignItems: 'center', gap: '6px' })}>
              <span className={css({ flex: 1, fontWeight: 700 })}>Dials · {layout}</span>
              <IconButton icon='close' label='Close dials' onClick={() => setExpanded(false)} />
            </div>
            <label
              className={css({ display: 'flex', alignItems: 'center', gap: '6px', opacity: 0.8, marginTop: '4px' })}
            >
              zoom
              <input
                type='range'
                min={0.5}
                max={1}
                step={0.05}
                value={panelZoom}
                onChange={event => setPanelZoom(parseFloat(event.target.value))}
                className={css({ flex: 1 })}
              />
              {Math.round(panelZoom * 100)}%
            </label>
            {popup ? (
              <div className={css({ display: 'flex', gap: '6px', margin: '8px 0' })}>
                <IconButton icon='focus' label='Focus popup' onClick={() => popup.focus()} />
                <IconButton icon='close' label='Close popup' onClick={() => popup.close()} />
              </div>
            ) : (
              controls
            )}
          </div>
          <div
            aria-label='Resize panel'
            onPointerDown={event => {
              event.preventDefault()
              event.currentTarget.setPointerCapture(event.pointerId)
              panelResize.current = { startY: event.clientY, height: screenHeight / panelZoom }
            }}
            onPointerMove={event => {
              const start = panelResize.current
              if (!start) return
              // Pointer travel is in screen pixels; the panel is scaled, so divide to keep the grip under the finger.
              setPanelHeight(Math.max(160, start.height + (event.clientY - start.startY) / panelZoom))
            }}
            onPointerUp={() => {
              panelResize.current = null
            }}
            onPointerCancel={() => {
              panelResize.current = null
            }}
            className={css({
              position: 'absolute',
              left: '50%',
              bottom: '-2px',
              width: '64px',
              height: '20px',
              marginLeft: '-32px',
              cursor: 'ns-resize',
              touchAction: 'none',
              _after: {
                content: '""',
                position: 'absolute',
                left: '16px',
                right: '16px',
                top: '8px',
                height: '4px',
                borderRadius: '2px',
                backgroundColor: 'fgOverlay20',
              },
            })}
          />
        </div>
      ) : null}
      {popup
        ? createPortal(
            <div
              className={css({
                padding: '8px 10px',
                fontSize: '13px',
                fontFamily: 'monospace',
                color: 'fg',
              })}
            >
              <h3 className={css({ margin: '0 0 6px', fontSize: '14px' })}>Sort dropdown dials · {layout}</h3>
              {controls}
            </div>,
            popup.document.body,
          )
        : null}
    </>
  )
}

export default DropdownDebugPanel
