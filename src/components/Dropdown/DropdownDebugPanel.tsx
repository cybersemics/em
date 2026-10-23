import { ReactNode, PointerEvent as ReactPointerEvent, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useSelector } from 'react-redux'
import { css } from '../../../styled-system/css'
import useBreakpoint from '../../hooks/useBreakpoint'
import storage from '../../util/storage'
import { DROPDOWN_Z_INDEX } from './Dropdown'
import MotionStepperControls from './DropdownMotionStepper'
import { CanvasTarget, DIAL_SET_EVENT, setCanvasEditing } from './canvasEditing'
import { DIALS_EVENT } from './dials'
import {
  DialsDevice,
  DialsPresence,
  DialsSyncMode,
  isDialsSyncAvailable,
  publishDials,
  pullDials,
  setDialsMode,
  subscribeDials,
  subscribeDialsDemoted,
  subscribeDialsPresence,
  subscribeDialsState,
} from './dialsSync'
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
  /**
   * Numeric controls get a scrub slider that writes `${value}${unit}`. Select controls choose from options. Colour
   * controls get a colour picker and a hex field. Text controls take any CSS value.
   */
  kind: 'number' | 'select' | 'text' | 'color'
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
  /**
   * Set on <html>, copied and synced like any control, but with no slider: edited on canvas instead (the light's and
   * the mask's geometry), and shown in the section's readout.
   */
  hidden?: boolean
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
    fallback: 'down-fade',
    hint: 'Around: the selected item stays on the button. Down: every item opens in the same place, the others spreading out from the button. Fade in place: only the selected item moves.',
  },
]

const SCRIM_CONTROLS: Control[] = [
  {
    name: '--sort-dropdown-scrim-opacity',
    label: 'screen dim',
    kind: 'number',
    min: 0,
    max: 1,
    step: 0.01,
    fallback: '0.65',
    hint: 'A dark fill over the whole screen. 0 = none, 1 = black.',
  },
]

const MASK_CONTROLS: Control[] = [
  {
    name: '--sort-dropdown-mask-strength',
    label: 'mask strength',
    kind: 'number',
    min: 0,
    max: 1,
    step: 0.01,
    fallback: '1',
    hint: 'How hidden the content is at the centre of the light. 0 = mask off, 1 = fully hidden.',
  },
  {
    hidden: true,
    name: '--sort-dropdown-mask-size',
    label: 'mask size',
    kind: 'number',
    min: 80,
    max: 600,
    step: 1,
    unit: 'px',
    fallback: '226px',
    hint: 'The ellipse’s width at a glow spread of 1; it also grows with the spread (Figma: ~545px at 1.9).',
  },
  {
    hidden: true,
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
    hidden: true,
    name: '--sort-dropdown-mask-core',
    label: 'fully hidden core',
    kind: 'number',
    min: 0,
    max: 90,
    step: 1,
    unit: '%',
    fallback: '44%',
    hint: 'How much of the ellipse, from the centre, stays at full strength before fading.',
  },
  {
    hidden: true,
    name: '--sort-dropdown-mask-falloff',
    label: 'fade ends at',
    kind: 'number',
    min: 30,
    max: 150,
    step: 1,
    unit: '%',
    fallback: '109%',
    hint: 'Where the content is fully visible again, as % of the ellipse. Lower = a tighter, harder edge.',
  },
  {
    hidden: true,
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
    hidden: true,
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

const GLOW_CONTROLS: Control[] = [
  {
    name: '--sort-dropdown-glow-spread',
    label: 'spread',
    kind: 'number',
    min: 0.5,
    max: 3,
    step: 0.05,
    fallback: '2.2',
    hint: 'The light’s radius: scales every light layer about its centre. Below 1 = tight, above 1 = diffuse.',
  },
  {
    name: '--sort-dropdown-glow-intensity',
    label: 'intensity',
    kind: 'number',
    min: 0,
    max: 2,
    step: 0.01,
    fallback: '1.2 | 0.84',
    hint: 'The light’s brightness: multiplies every light layer’s opacity. Doesn’t change its size.',
  },
  {
    name: '--sort-dropdown-glow-hue',
    label: 'hue shift',
    kind: 'number',
    min: -180,
    max: 180,
    step: 1,
    unit: 'deg',
    fallback: '0deg',
    hint: 'Rotates the colour of every light layer together.',
  },
  {
    hidden: true,
    name: '--sort-dropdown-glow-offset-x',
    label: 'light origin, horizontal',
    kind: 'number',
    unit: 'px',
    fallback: '0px | -20px',
  },
  {
    hidden: true,
    name: '--sort-dropdown-glow-offset-y',
    label: 'light origin, vertical',
    kind: 'number',
    unit: 'px',
    fallback: '0px | 52px',
  },
]

const BLUR_CONTROLS: Control[] = [
  {
    hidden: true,
    name: '--sort-dropdown-blur-enabled',
    label: 'radial blur',
    kind: 'select',
    options: [
      { value: 'off', label: 'off' },
      { value: 'on', label: 'on' },
    ],
    fallback: 'on',
    hint: 'A progressive blur behind the light: strongest at its core, easing off outward.',
  },
  {
    name: '--sort-dropdown-blur-core',
    label: 'core blur',
    kind: 'number',
    min: 0,
    max: 40,
    step: 0.5,
    unit: 'px',
    fallback: '6px',
    hint: 'Blur inside the inner ellipse.',
  },
  {
    name: '--sort-dropdown-blur-edge',
    label: 'edge blur',
    kind: 'number',
    min: 0,
    max: 20,
    step: 0.5,
    unit: 'px',
    fallback: '2px',
    hint: 'Blur at the outer ellipse; beyond it there is none.',
  },
  {
    name: '--sort-dropdown-blur-inner',
    label: 'inner radius',
    kind: 'number',
    min: 0,
    max: 600,
    step: 5,
    unit: 'px',
    fallback: '110px | 200px',
    hint: 'Horizontal radius of the fully blurred core.',
  },
  {
    name: '--sort-dropdown-blur-outer',
    label: 'outer radius',
    kind: 'number',
    min: 40,
    max: 1200,
    step: 5,
    unit: 'px',
    fallback: '260px | 462px',
    hint: 'Horizontal radius where the blur has eased off to the edge blur.',
  },
  {
    name: '--sort-dropdown-blur-aspect',
    label: 'aspect (height ÷ width)',
    kind: 'number',
    min: 0.3,
    max: 3,
    step: 0.01,
    fallback: '0.94',
  },
  {
    name: '--sort-dropdown-blur-offset-x',
    label: 'offset, horizontal',
    kind: 'number',
    min: -400,
    max: 400,
    step: 1,
    unit: 'px',
    fallback: '0px',
    hint: 'From the light’s centre.',
  },
  {
    name: '--sort-dropdown-blur-offset-y',
    label: 'offset, vertical',
    kind: 'number',
    min: -400,
    max: 400,
    step: 1,
    unit: 'px',
    fallback: '0px',
  },
  {
    name: '--sort-dropdown-blur-layers',
    label: 'layers',
    kind: 'number',
    min: 1,
    max: 12,
    step: 1,
    fallback: '4',
    hint: 'More layers give a smoother falloff and cost more to draw.',
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

/** Blend modes a light layer can use. */
const BLEND_OPTIONS = [
  'normal',
  'screen',
  'plus-lighter',
  'overlay',
  'soft-light',
  'color-dodge',
  'lighten',
  'multiply',
].map(value => ({ value, label: value }))

/** A layer's visibility, written as 1 (shown) or 0 (hidden) so CSS can multiply by it. Set by the eye toggle. */
const visibilityControl = (name: string): Control => ({
  hidden: true,
  name,
  label: 'visible',
  kind: 'text',
  fallback: '1',
})

/** A colour dial with a picker. */
const colourControl = (name: string, label: string, fallback: string, hint?: string): Control => ({
  name,
  label,
  kind: 'color',
  fallback,
  hint,
})

/** The dials every light layer has, around its design values. */
const lightLayerControls = (
  id: string,
  design: { opacity: number; blend: string; falloffStart: number; falloffEnd: number },
): Control[] => [
  {
    name: `--sort-dropdown-${id}-opacity`,
    label: 'opacity',
    kind: 'number',
    min: 0,
    max: 1,
    step: 0.01,
    fallback: String(design.opacity),
    hint: 'Before the light’s intensity, which multiplies it.',
  },
  {
    name: `--sort-dropdown-${id}-blend`,
    label: 'blend mode',
    kind: 'select',
    options: BLEND_OPTIONS,
    fallback: design.blend,
  },
  {
    name: `--sort-dropdown-${id}-size`,
    label: 'size',
    kind: 'number',
    min: 0.2,
    max: 3,
    step: 0.01,
    fallback: '1',
    hint: 'Relative to its design size, about its own centre. On canvas: the outer handle.',
  },
  {
    name: `--sort-dropdown-${id}-falloff-start`,
    label: 'falloff starts at',
    kind: 'number',
    min: 0,
    max: 100,
    step: 1,
    fallback: String(design.falloffStart),
    hint: '% of its ellipse that stays at full strength. On canvas: the inner handle.',
  },
  {
    name: `--sort-dropdown-${id}-falloff-end`,
    label: 'falloff ends at',
    kind: 'number',
    min: 10,
    max: 150,
    step: 1,
    fallback: String(design.falloffEnd),
    hint: '% of its ellipse where it has faded out.',
  },
  {
    name: `--sort-dropdown-${id}-offset-x`,
    label: 'offset, horizontal',
    kind: 'number',
    min: -300,
    max: 300,
    step: 1,
    unit: 'px',
    fallback: '0px',
    hint: 'From where it sits in the design. On canvas: the centre handle.',
  },
  {
    name: `--sort-dropdown-${id}-offset-y`,
    label: 'offset, vertical',
    kind: 'number',
    min: -300,
    max: 300,
    step: 1,
    unit: 'px',
    fallback: '0px',
  },
  visibilityControl(`--sort-dropdown-${id}-visible`),
]

/**
 * One entry in the panel's list: a visual layer (with an eye toggle and an inline main value) or a group of settings
 * that isn't a layer (Opening, Type & spacing, Motion). Tapping it opens its inspector, which shows only its dials and,
 * for a layer with geometry, puts its ellipse on the canvas.
 */
interface Group {
  /** Stable key, persisted as the open inspector. */
  id: string
  title: string
  /** Shown beside the title. */
  note?: string
  kind: 'layer' | 'entry'
  /** Indented under the light group, whose spread, intensity and origin apply to it too. */
  child?: boolean
  controls: Control[]
  /** The eye toggle's dial, and what it holds when shown and when hidden. */
  visibility?: { name: string; on: string; off: string }
  /** The control shown inline in the list, scrubbable without opening the inspector. */
  main?: string
  /** The ellipse edited on canvas while this group's inspector is open. */
  canvas?: CanvasTarget
  /** Values edited only on canvas, shown read-only in the inspector: [label, property, design value]. */
  readout?: [string, string, string][]
}

/** The light layers' design values, as DropdownLight's LIGHT_LAYER_DEFAULTS. */
const LIGHT_DESIGN = {
  tint: { opacity: 0.28, blend: 'normal', falloffStart: 30, falloffEnd: 100 },
  image: { opacity: 0.22, blend: 'screen', falloffStart: 35, falloffEnd: 100 },
  band: { opacity: 0.5, blend: 'screen', falloffStart: 0, falloffEnd: 100 },
  bloom: { opacity: 1, blend: 'plus-lighter', falloffStart: 0, falloffEnd: 100 },
  selection: { opacity: 0.14, blend: 'plus-lighter', falloffStart: 0, falloffEnd: 100 },
}

/** The panel's list, layers in stacking order (top first), then the entries that aren't layers. */
const GROUPS: Group[] = [
  {
    id: 'rows',
    title: 'Rows',
    note: 'menu text',
    kind: 'layer',
    visibility: { name: '--sort-dropdown-rows-visible', on: '1', off: '0' },
    main: '--sort-dropdown-rows-opacity',
    controls: [
      {
        name: '--sort-dropdown-rows-opacity',
        label: 'opacity',
        kind: 'number',
        min: 0,
        max: 1,
        step: 0.01,
        fallback: '1',
      },
      visibilityControl('--sort-dropdown-rows-visible'),
    ],
  },
  {
    id: 'selection',
    title: 'Selection glow',
    kind: 'layer',
    visibility: { name: '--sort-dropdown-selection-visible', on: '1', off: '0' },
    main: '--sort-dropdown-selection-opacity',
    canvas: 'selection',
    controls: [
      colourControl('--sort-dropdown-selection-colour', 'colour', '#aaa0ff'),
      ...lightLayerControls('selection', LIGHT_DESIGN.selection),
    ],
  },
  {
    id: 'light',
    title: 'Light',
    note: 'group',
    kind: 'layer',
    visibility: { name: '--sort-dropdown-glow-visible', on: '1', off: '0' },
    main: '--sort-dropdown-glow-intensity',
    canvas: 'light',
    controls: [...GLOW_CONTROLS, visibilityControl('--sort-dropdown-glow-visible')],
    readout: [
      ['origin x', '--sort-dropdown-glow-offset-x', '0px | -20px'],
      ['origin y', '--sort-dropdown-glow-offset-y', '0px | 52px'],
    ],
  },
  {
    id: 'bloom',
    title: 'Bloom',
    kind: 'layer',
    child: true,
    visibility: { name: '--sort-dropdown-bloom-visible', on: '1', off: '0' },
    main: '--sort-dropdown-bloom-opacity',
    canvas: 'bloom',
    controls: [
      colourControl('--sort-dropdown-bloom-centre-colour', 'centre colour', '#7869e1'),
      colourControl('--sort-dropdown-bloom-edge-colour', 'edge colour', '#2c2c85', 'The colour it fades towards.'),
      ...lightLayerControls('bloom', LIGHT_DESIGN.bloom),
    ],
  },
  {
    id: 'band',
    title: 'Band',
    kind: 'layer',
    child: true,
    visibility: { name: '--sort-dropdown-band-visible', on: '1', off: '0' },
    main: '--sort-dropdown-band-opacity',
    canvas: 'band',
    controls: [
      colourControl(
        '--sort-dropdown-band-colour',
        'colour',
        '#434378',
        'Its gradient’s opaque end (the left end is transparent).',
      ),
      ...lightLayerControls('band', LIGHT_DESIGN.band),
    ],
  },
  {
    id: 'image',
    title: 'Glow image',
    note: 'PNG',
    kind: 'layer',
    child: true,
    visibility: { name: '--sort-dropdown-image-visible', on: '1', off: '0' },
    main: '--sort-dropdown-image-opacity',
    canvas: 'image',
    controls: [
      {
        name: '--sort-dropdown-image-hue',
        label: 'hue',
        kind: 'number',
        min: -180,
        max: 180,
        step: 1,
        unit: 'deg',
        fallback: '0deg',
        hint: 'It’s a bitmap, so it’s recoloured by rotating its hue.',
      },
      {
        name: '--sort-dropdown-image-saturate',
        label: 'saturation',
        kind: 'number',
        min: 0,
        max: 400,
        step: 1,
        unit: '%',
        fallback: '100%',
      },
      ...lightLayerControls('image', LIGHT_DESIGN.image),
    ],
  },
  {
    id: 'tint',
    title: 'Tint',
    kind: 'layer',
    child: true,
    visibility: { name: '--sort-dropdown-tint-visible', on: '1', off: '0' },
    main: '--sort-dropdown-tint-opacity',
    canvas: 'tint',
    controls: [
      colourControl(
        '--sort-dropdown-tint-colour',
        'colour',
        '#434378',
        'Its gradient’s opaque end (the left end is transparent).',
      ),
      ...lightLayerControls('tint', LIGHT_DESIGN.tint),
    ],
  },
  {
    id: 'scrim',
    title: 'Screen dim',
    kind: 'layer',
    visibility: { name: '--sort-dropdown-scrim-visible', on: '1', off: '0' },
    main: '--sort-dropdown-scrim-opacity',
    controls: [...SCRIM_CONTROLS, visibilityControl('--sort-dropdown-scrim-visible')],
  },
  {
    id: 'blur',
    title: 'Radial blur',
    kind: 'layer',
    visibility: { name: '--sort-dropdown-blur-enabled', on: 'on', off: 'off' },
    main: '--sort-dropdown-blur-core',
    canvas: 'blur',
    controls: BLUR_CONTROLS,
  },
  {
    id: 'mask',
    title: 'Mask',
    note: 'on content',
    kind: 'layer',
    visibility: { name: '--sort-dropdown-mask-visible', on: '1', off: '0' },
    main: '--sort-dropdown-mask-strength',
    canvas: 'mask',
    controls: [...MASK_CONTROLS, visibilityControl('--sort-dropdown-mask-visible')],
    readout: [
      ['size', '--sort-dropdown-mask-size', '226px'],
      ['aspect', '--sort-dropdown-mask-aspect', '1.11'],
      ['core', '--sort-dropdown-mask-core', '44%'],
      ['fade ends', '--sort-dropdown-mask-falloff', '109%'],
      ['offset x', '--sort-dropdown-mask-offset-x', '0px'],
      ['offset y', '--sort-dropdown-mask-offset-y', '0px'],
    ],
  },
  { id: 'opening', title: 'Opening', kind: 'entry', controls: OPENING_CONTROLS },
  { id: 'type', title: 'Type & spacing', kind: 'entry', controls: ROWS_CONTROLS },
  { id: 'motion', title: 'Motion', note: 'freeze & step frames', kind: 'entry', controls: [] },
  { id: 'paste', title: 'Overrides to paste back', note: 'for baking in', kind: 'entry', controls: [] },
]

const ALL_CONTROLS = GROUPS.flatMap(group => group.controls)

/** The open inspector, persisted so a reload returns to it. */
const VIEW_KEY = 'sortDropdownDials.view'
const VALUES_KEY = 'sortDropdownDials.values'
/** This device's sync mode (off, lead or follow). */
const SYNC_MODE_KEY = 'sortDropdownDials.syncMode'
/** A follower's own values, put aside while it follows and restored when it switches to Off. */
const STASH_KEY = 'sortDropdownDials.stash'
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
  back: <path d='M15 5l-7 7 7 7' />,
  chevron: <path d='M9 5l7 7-7 7' />,
  eye: (
    <>
      <path d='M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z' />
      <circle cx='12' cy='12' r='3' />
    </>
  ),
  eyeOff: (
    <>
      <path d='M2 12s3.6-7 10-7c2 0 3.7.7 5.1 1.6M22 12s-3.6 7-10 7c-2 0-3.7-.7-5.1-1.6' />
      <path d='M4 20L20 4' />
    </>
  ),
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

/** How far a press must move (px) before it counts as a scrub rather than a tap. */
const SCRUB_SLOP = 6

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
  // A press that hasn't moved far enough to count as a scrub yet. A vertical swipe that starts on the slider is left to
  // the browser so the panel scrolls; a horizontal one becomes a scrub; one that doesn't move is a tap.
  const press = useRef<{ x: number; y: number } | null>(null)
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

  /** Notes the press; whether it becomes a scrub, a tap or a scroll depends on how it moves. */
  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.stopPropagation()
    press.current = { x: event.clientX, y: event.clientY }
  }

  /** Jumps to where the track was tapped. */
  const jumpTo = (clientX: number) => {
    const rect = trackRef.current!.getBoundingClientRect()
    const next = settle(min + ((clientX - rect.left) / rect.width) * (max - min), 1)
    onChange(next.value, next.decimals)
  }

  /** Moves the value by the pointer's horizontal travel, scaled by the band it is in. */
  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    // A press becomes a scrub once it moves more across than down. Vertical presses are left alone: on touch the browser
    // scrolls the panel (and cancels the pointer); with a mouse nothing happens.
    if (!drag.current && press.current) {
      const dx = Math.abs(event.clientX - press.current.x)
      const dy = Math.abs(event.clientY - press.current.y)
      if (dx < SCRUB_SLOP && dy < SCRUB_SLOP) return
      if (dy >= dx) {
        press.current = null
        return
      }
      event.currentTarget.setPointerCapture(event.pointerId)
      // Scrubs continue from the current value, starting where the press began.
      drag.current = { lastX: press.current.x, raw: value }
      press.current = null
      setBand(SCRUB_BANDS[0])
    }
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

  /** Ends the drag. Also called when the browser takes the touch over to scroll. */
  const onPointerEnd = () => {
    drag.current = null
    press.current = null
    setBand(null)
  }

  /** Ends a scrub, or treats a press that never moved as a tap. */
  const onPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (press.current) jumpTo(event.clientX)
    onPointerEnd()
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
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerEnd}
      className={css({
        position: 'relative',
        height: '40px',
        cursor: 'ew-resize',
        // Vertical pans stay with the browser so a swipe that starts on a slider still scrolls the panel. Once a touch
        // has started moving sideways the browser won't scroll it, so a scrub can stray up and down into finer bands.
        touchAction: 'pan-y',
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

/** A slider's value written back as a dial: trimmed decimals, plus the control's unit. */
const formatNumber = (value: number, decimals: number, unit = '') =>
  `${value.toFixed(decimals).replace(/\.?0+$/, '') || '0'}${unit}`

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
      {control.kind === 'color' ? (
        <input
          type='color'
          // The picker only takes six-digit hex; anything else in the text field shows the design colour.
          value={/^#[0-9a-f]{6}$/i.test(value) ? value : control.fallback}
          onChange={event => onChange(event.target.value)}
          className={css({ width: '100%', height: '40px', padding: 0, border: 'none', background: 'transparent' })}
        />
      ) : null}
      {control.kind === 'number' ? (
        <ScrubSlider
          value={numeric}
          min={control.min ?? 0}
          max={control.max ?? 1}
          step={control.step ?? 0.01}
          onChange={(next, decimals) => onChange(formatNumber(next, decimals, control.unit))}
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

/** The dial's value as shown: the override where set, otherwise the layout's design value. */
const shownValue = (control: Control, value: string, isDesktop: boolean) =>
  value ||
  (control.fallback.includes('|') ? `${fallbackNumber(control, isDesktop)}${control.unit ?? ''}` : control.fallback)

/** Whether a layer is shown, by its eye toggle's dial. */
const isShown = (group: Group, values: Record<string, string>) =>
  !group.visibility || (values[group.visibility.name] || group.visibility.on) !== group.visibility.off

/**
 * Flips a layer's eye toggle. Showing it again clears the override rather than writing the default, so the copied
 * overrides only list layers that are actually hidden.
 */
const toggleVisibility = (
  group: Group,
  setValues: (update: (previous: Record<string, string>) => Record<string, string>) => void,
) =>
  setValues(previous => {
    if (!group.visibility) return previous
    const next = { ...previous }
    if (isShown(group, previous)) next[group.visibility.name] = group.visibility.off
    else delete next[group.visibility.name]
    return next
  })

/** The eye toggle for a layer. */
const EyeToggle = ({
  group,
  values,
  setValues,
}: {
  group: Group
  values: Record<string, string>
  setValues: (update: (previous: Record<string, string>) => Record<string, string>) => void
}) => {
  const shown = isShown(group, values)
  return (
    <IconButton
      icon={shown ? 'eye' : 'eyeOff'}
      label={`${shown ? 'Hide' : 'Show'} ${group.title}`}
      onClick={() => toggleVisibility(group, setValues)}
      pressed={!shown}
    />
  )
}

/**
 * One row of the layers list: the eye toggle, the layer's name, its main value as a small scrub slider, and a chevron
 * that opens its inspector. Tapping the name opens it too.
 */
const LayerRow = ({
  group,
  values,
  setValues,
  isDesktop,
  onOpen,
}: {
  group: Group
  values: Record<string, string>
  setValues: (update: (previous: Record<string, string>) => Record<string, string>) => void
  isDesktop: boolean
  onOpen: () => void
}) => {
  const main = group.main ? group.controls.find(control => control.name === group.main) : undefined
  const mainValue = main ? (values[main.name] ?? '') : ''
  const overridden = group.controls.filter(control => values[control.name]).length
  const shown = isShown(group, values)
  return (
    <div
      data-dials-group={group.id}
      className={css({
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        minHeight: '44px',
        borderBottom: '1px solid {colors.fgOverlay10}',
      })}
      style={{ paddingLeft: group.child ? 14 : 0, opacity: shown ? 1 : 0.55 }}
    >
      {group.visibility ? (
        <EyeToggle group={group} values={values} setValues={setValues} />
      ) : (
        <span className={css({ width: '36px', flex: 'none' })} />
      )}
      <button
        type='button'
        onClick={onOpen}
        className={css({
          flex: 1,
          minWidth: 0,
          minHeight: '40px',
          padding: '0 2px',
          textAlign: 'left',
          fontFamily: 'monospace',
          fontSize: '13px',
          color: 'fg',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        })}
      >
        {group.child ? '└ ' : ''}
        <span className={css({ fontWeight: 700 })}>{group.title}</span>
        {group.note ? <span className={css({ opacity: 0.5 })}> {group.note}</span> : null}
        {overridden ? <span className={css({ color: 'vividHighlight' })}> •{overridden}</span> : null}
      </button>
      {/* The list shows the main value only; its slider lives in the inspector, where there is room for it. */}
      {main && main.kind === 'number' ? (
        <span
          className={css({ flex: 'none', textAlign: 'right', opacity: 0.8, fontSize: '12px', whiteSpace: 'nowrap' })}
        >
          {shownValue(main, mainValue, isDesktop)}
        </span>
      ) : null}
      <IconButton icon='chevron' label={`Open ${group.title}`} onClick={onOpen} />
    </div>
  )
}

/** A read-only line of values edited on canvas: the override where set, otherwise the design value. */
const Readout = ({
  values,
  items,
  isDesktop,
}: {
  values: Record<string, string>
  items: [string, string, string][]
  isDesktop: boolean
}) => (
  <p className={css({ margin: '0 0 8px', opacity: 0.7, fontFamily: 'monospace' })}>
    {items
      .map(([label, name, fallback]) => {
        // "mobile | desktop" design values: show the current layout's.
        const parts = fallback.split('|').map(part => part.trim())
        return `${label} ${values[name] || (parts.length > 1 ? parts[isDesktop ? 1 : 0] : parts[0])}`
      })
      .join(' · ')}
  </p>
)

/**
 * A group's inspector: replaces the list, with a back arrow. Shows the group's eye toggle, a reset for just its dials,
 * a note when its ellipse is on the canvas, its canvas-only values, and its controls. Children render above the
 * controls (the motion stepper, the overrides to paste back).
 */
const Inspector = ({
  group,
  values,
  setValues,
  isDesktop,
  onBack,
  children,
}: {
  group: Group
  values: Record<string, string>
  setValues: (update: (previous: Record<string, string>) => Record<string, string>) => void
  isDesktop: boolean
  onBack: () => void
  children?: ReactNode
}) => {
  const overridden = group.controls.filter(control => values[control.name]).length

  /** Drops this group's overrides, leaving the others in place. */
  const resetGroup = () =>
    setValues(previous => {
      const next = { ...previous }
      group.controls.forEach(control => delete next[control.name])
      return next
    })

  return (
    <div data-dials-inspector={group.id}>
      <div
        className={css({
          position: 'sticky',
          top: 0,
          zIndex: 1,
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 0',
          marginBottom: '6px',
          backgroundColor: 'bg',
          borderBottom: '1px solid {colors.fgOverlay20}',
        })}
      >
        <IconButton icon='back' label='Back to layers' onClick={onBack} />
        <span className={css({ flex: 1, minWidth: 0, fontWeight: 700 })}>
          {group.title}
          {group.note ? <span className={css({ opacity: 0.5, fontWeight: 400 })}> {group.note}</span> : null}
        </span>
        {group.visibility ? <EyeToggle group={group} values={values} setValues={setValues} /> : null}
        {group.controls.length ? (
          <IconButton icon='reset' label={`Reset ${group.title}`} onClick={resetGroup} disabled={!overridden} />
        ) : null}
      </div>
      {group.canvas ? (
        <p className={css({ margin: '0 0 8px', opacity: 0.6 })}>
          Open the sort menu to see its outline on screen; drag the handles to edit it.
        </p>
      ) : null}
      {group.readout ? <Readout values={values} items={group.readout} isDesktop={isDesktop} /> : null}
      {children}
      {group.controls
        .filter(control => !control.hidden)
        .map(control => (
          <ControlRow
            key={control.name}
            control={control}
            value={values[control.name] ?? ''}
            isDesktop={isDesktop}
            onChange={value => setValues(previous => ({ ...previous, [control.name]: value }))}
          />
        ))}
    </div>
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
  // Set when a press ends without dragging; the click that follows it opens the panel.
  const tapped = useRef(false)

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
      onClick={event => {
        event.stopPropagation()
        // A press that ended a drag also clicks; only a tap opens the panel.
        if (!tapped.current) return
        tapped.current = false
        onOpen()
      }}
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
          // Opened by the click that follows, not here: on touch, the browser follows a tap with a click at the same
          // spot, and if the panel opened now that click would land on whatever control it put under the finger.
          tapped.current = true
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

/** The sync modes, in the order the control shows them, with the tooltip that explains each. */
const SYNC_MODES: { mode: DialsSyncMode; label: string; title: string }[] = [
  { mode: 'off', label: 'Off', title: 'Off: this device keeps its own values; it sends and receives nothing' },
  {
    mode: 'lead',
    label: 'Lead',
    title: 'Lead: this device’s values are the session; every change goes to the devices following it',
  },
  {
    mode: 'follow',
    label: 'Follow',
    title: 'Follow: show the leading device’s values live (yours are kept and come back when you switch to Off)',
  },
]

/** A three-way segmented control for this device's sync mode. */
const SyncModeControl = ({ mode, onChange }: { mode: DialsSyncMode; onChange: (mode: DialsSyncMode) => void }) => (
  <div
    role='radiogroup'
    aria-label='Sync with other devices'
    className={css({
      display: 'flex',
      flex: 'none',
      height: '36px',
      border: '1px solid {colors.fgOverlay20}',
      borderRadius: '8px',
      overflow: 'hidden',
    })}
  >
    {SYNC_MODES.map(option => (
      <button
        key={option.mode}
        type='button'
        role='radio'
        aria-checked={mode === option.mode}
        title={option.title}
        onClick={() => onChange(option.mode)}
        className={css({
          padding: '0 9px',
          fontFamily: 'monospace',
          fontSize: '12px',
          color: 'fg',
          border: 'none',
          cursor: 'pointer',
        })}
        style={{ backgroundColor: mode === option.mode ? 'rgba(120, 105, 225, 0.45)' : 'rgba(255, 255, 255, 0.06)' }}
      >
        {option.label}
      </button>
    ))}
  </div>
)

/** The line under the sync control: this device's role, the leader and followers, and the last sync event. */
const syncStatusLine = (mode: DialsSyncMode, presence: DialsPresence | null, note: string): string => {
  if (!presence) return 'Connecting to the dev server…'
  const others = presence.count - 1
  const devices = others <= 0 ? `No other device on ${location.host}` : `${presence.count} devices on ${location.host}`
  const role =
    mode === 'lead'
      ? `Leading · ${presence.followers} follower${presence.followers === 1 ? '' : 's'}`
      : mode === 'follow'
        ? presence.leader
          ? `Following ${presence.leader.name}`
          : 'No leader'
        : presence.leader
          ? `Off · ${presence.leader.name} is leading`
          : 'Off'
  return [role, devices, note].filter(Boolean).join(' · ')
}

/** The design-dials panel for the sort dropdown: a floating button over the Command Universe that opens the dials, inline or in a popup window. */
const DropdownDebugPanel = () => {
  // The frame stepper's state lives here, in the component that stays mounted, so freezing works while collapsed.
  const motion = useMotionStepper()
  const [values, setValues] = useState<Record<string, string>>(readValues)
  // The canvas editor sets dials through an event; apply them like control changes, so copy and sync see them.
  useEffect(() => {
    /** Applies one dial set from the canvas. */
    const onDialSet = (event: Event) => {
      const { name, value } = (event as CustomEvent<{ name: string; value: string }>).detail
      // Read-only while following another device (see editValues).
      if (storage.getItem(SYNC_MODE_KEY) === 'follow' && isDialsSyncAvailable()) return
      setValues(previous => ({ ...previous, [name]: value }))
    }
    window.addEventListener(DIAL_SET_EVENT, onDialSet)
    return () => window.removeEventListener(DIAL_SET_EVENT, onDialSet)
  }, [])
  // The open inspector's group id, or null for the layers list.
  const [view, setViewState] = useState<string | null>(() => storage.getItem(VIEW_KEY) || null)
  const viewGroup = GROUPS.find(group => group.id === view) ?? null
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
  // This device's part in the session: off (alone), lead (its values are the session) or follow (shows the leader's).
  const [syncMode, setSyncModeState] = useState<DialsSyncMode>(() => {
    const stored = storage.getItem(SYNC_MODE_KEY)
    return stored === 'lead' || stored === 'follow' ? stored : 'off'
  })
  // Read by the subscriptions, which are set up once.
  const syncModeRef = useRef(syncMode)
  syncModeRef.current = syncMode
  const valuesRef = useRef(values)
  valuesRef.current = values
  // Who is connected to this dev server: the panel count, the leader and its followers.
  const [presence, setPresence] = useState<DialsPresence | null>(null)
  // A short note on the last sync event, shown under the mode control.
  const [syncStatus, setSyncStatus] = useState('')
  // True while applying the leader's values, so a leader's own change effect doesn't treat them as a local edit.
  const applyingRemote = useRef(false)
  // False until the first render's values have been seen, so loading the panel doesn't send its stored values.
  const hasLoaded = useRef(false)
  // While following, the panel is read-only: edits are ignored (the leader's values would overwrite them).
  const following = syncAvailable && syncMode === 'follow'
  /** Applies an edit from the panel, unless this device is following, when edits are ignored. */
  const editValues: typeof setValues = update => {
    if (syncModeRef.current === 'follow' && syncAvailable) return
    setValues(update)
  }

  /** Opens a group's inspector, or the layers list with null, and remembers it for the next reload. */
  const setView = (id: string | null) => {
    storage.setItem(VIEW_KEY, id ?? '')
    setViewState(id)
  }

  // A layer's ellipse is on the canvas while its inspector is open, and the panel or its popup is showing.
  useEffect(() => {
    setCanvasEditing((expanded || popup) && viewGroup?.canvas ? viewGroup.canvas : null)
  }, [expanded, popup, viewGroup])

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

  /** Applies the leader's values. */
  const applyLeader = (leaderValues: Record<string, string>) => {
    applyingRemote.current = true
    setValues(leaderValues)
  }

  /** Puts this device's own values aside before it starts following, unless they already are. */
  const stashOwnValues = () => {
    if (storage.getItem(STASH_KEY) === null) storage.setItem(STASH_KEY, JSON.stringify(valuesRef.current))
  }

  /** Switches this device's sync mode, remembers it, and tells the server. */
  const setSyncMode = (next: DialsSyncMode) => {
    const previous = syncModeRef.current
    if (next === previous) return
    storage.setItem(SYNC_MODE_KEY, next)
    syncModeRef.current = next
    setSyncModeState(next)
    if (next === 'follow') {
      stashOwnValues()
      setDialsMode('follow')
      pullDials()
      setSyncStatus('Joining…')
    } else if (next === 'lead') {
      // Leading from what is on screen now; a follower's stash is no longer needed.
      storage.removeItem(STASH_KEY)
      setDialsMode('lead', valuesRef.current)
      setSyncStatus('')
    } else {
      setDialsMode('off')
      // Back to this device's own values from before it followed.
      const stash = storage.getItem(STASH_KEY)
      if (previous === 'follow' && stash !== null) {
        try {
          setValues(JSON.parse(stash) as Record<string, string>)
        } catch {
          // A malformed stash leaves the current values in place.
        }
        setSyncStatus('Restored this device’s own values')
      } else setSyncStatus('')
      storage.removeItem(STASH_KEY)
    }
  }

  // Subscriptions: the leader's values, the answer to a pull, presence, and being replaced as leader.
  useEffect(() => {
    if (!syncAvailable) return
    const unsubscribers = [
      subscribeDials((leaderValues, leader: DialsDevice) => {
        if (syncModeRef.current !== 'follow') return
        applyLeader(leaderValues)
        // Keep a takeover note visible over the new leader's first push.
        setSyncStatus(note => (note.endsWith('took over') ? note : `Updated by ${leader.name}`))
      }),
      subscribeDialsState((leader, leaderValues) => {
        if (syncModeRef.current !== 'follow') return
        if (leader && leaderValues) {
          applyLeader(leaderValues)
          setSyncStatus('')
        } else setSyncStatus('No leader yet: values stay as they are')
      }),
      subscribeDialsPresence(setPresence),
      subscribeDialsDemoted(by => {
        stashOwnValues()
        storage.setItem(SYNC_MODE_KEY, 'follow')
        syncModeRef.current = 'follow'
        setSyncModeState('follow')
        setSyncStatus(`${by.name} took over`)
      }),
    ]
    // Register, resuming the mode left on before a reload: a leader pushes its values, a follower pulls the leader's.
    const mode = syncModeRef.current
    setDialsMode(mode, mode === 'lead' ? valuesRef.current : undefined)
    if (mode === 'follow') pullDials()
    return () => unsubscribers.forEach(unsubscribe => unsubscribe())
    // Subscribes once; the handlers read refs.
  }, [syncAvailable])

  // While leading, send every local change. Skips the first render (registering sent the values) and values that
  // arrived from a leader (only relevant if this device has just taken over).
  useEffect(() => {
    if (!hasLoaded.current) {
      hasLoaded.current = true
      return
    }
    if (applyingRemote.current) {
      applyingRemote.current = false
      return
    }
    if (syncAvailable && syncModeRef.current === 'lead') publishDials(values)
  }, [values, syncAvailable])

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

  const layout = isDesktop ? 'desktop (≥ 400px)' : 'mobile (< 400px)'
  const set = Object.fromEntries(Object.entries(values).filter(([, value]) => value))
  const overriddenCount = Object.keys(set).length
  // Every override grouped by section with the fallback it replaces, so the list can be pasted into the pull request
  // and each value located in the code it belongs to.
  const overrideRows = GROUPS.flatMap(group => {
    const rows = group.controls
      .filter(control => values[control.name])
      .map(control => `${control.name}: ${values[control.name]};  /* was ${control.fallback} */`)
    return rows.length ? [`// ${group.title}`, ...rows] : []
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
      <IconButton
        icon='reset'
        label='Reset all overrides'
        onClick={() => editValues({})}
        disabled={!overriddenCount || following}
      />
      <IconButton
        icon='popup'
        label={popup ? 'Close popup' : 'Open in popup'}
        onClick={() => (popup ? popup.close() : openPopup())}
      />
      {syncAvailable ? <SyncModeControl mode={syncMode} onChange={setSyncMode} /> : null}
      {syncAvailable ? (
        <p className={css({ flexBasis: '100%', margin: 0, opacity: 0.6 })}>
          {syncStatusLine(syncMode, presence, syncStatus)}
        </p>
      ) : null}
    </div>
  )

  // The scrolling body: the layers list, or one group's inspector in its place.
  const body = viewGroup ? (
    <Inspector
      group={viewGroup}
      values={values}
      setValues={editValues}
      isDesktop={isDesktop}
      onBack={() => setView(null)}
    >
      {viewGroup.id === 'motion' ? <MotionStepperControls motion={motion} Slider={ScrubSlider} /> : null}
      {viewGroup.id === 'paste' ? (
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
    </Inspector>
  ) : (
    <div data-dials-layers=''>
      {GROUPS.filter(group => group.kind === 'layer').map(group => (
        <LayerRow
          key={group.id}
          group={group}
          values={values}
          setValues={editValues}
          isDesktop={isDesktop}
          onOpen={() => setView(group.id)}
        />
      ))}
      <p className={css({ margin: '12px 0 4px', opacity: 0.5 })}>Settings</p>
      {GROUPS.filter(group => group.kind === 'entry').map(group => (
        <LayerRow
          key={group.id}
          group={group}
          values={values}
          setValues={editValues}
          isDesktop={isDesktop}
          onOpen={() => setView(group.id)}
        />
      ))}
      <p className={css({ margin: '10px 0 4px', opacity: 0.5 })}>
        Tap a row to edit it; its outline shows on screen while the sort menu is open. Drag a slider sideways to change
        it; move your finger up or down off it to scrub finely.
      </p>
    </div>
  )

  /** The scrolling area under the pinned header. */
  const scrollBody = (
    <div
      className={css({
        flex: 1,
        minHeight: 0,
        overflowY: 'auto',
        overscrollBehavior: 'contain',
        touchAction: 'pan-y',
        padding: '0 10px 8px',
      })}
    >
      {following ? (
        <p
          className={css({
            margin: '8px 0',
            padding: '6px 8px',
            borderRadius: '6px',
            backgroundColor: 'fgOverlay10',
          })}
        >
          Following {presence?.leader?.name ?? 'the leader'}. Switch to Off or Lead to edit.
        </p>
      ) : null}
      {body}
    </div>
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
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              backgroundColor: 'bgOverlay80',
              // Blur what's behind, so the menu's own text under the panel doesn't compete with the controls.
              backdropFilter: 'blur(14px)',
              border: '1px solid {colors.fgOverlay20}',
              borderRadius: '10px',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)',
            })}
          >
            {/* Pinned header: title, zoom and the toolbar stay put while the list or inspector scrolls. */}
            <div className={css({ flex: 'none', padding: '8px 10px 0' })}>
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
                toolbar
              )}
            </div>
            {popup ? null : scrollBody}
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
              {toolbar}
              {body}
            </div>,
            popup.document.body,
          )
        : null}
    </>
  )
}

export default DropdownDebugPanel
