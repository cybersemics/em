import React, { createContext, useContext, useState } from 'react'
import { css } from '../../../styled-system/css'

/**
 * Live design-tuning overlay for the Mobile Command Universe dialog.
 * The overlay reads from / writes to a React context whose values are consumed by the
 * dialog's components via inline `style` props (since these are dynamic and can't go
 * through Panda's compile-time recipe). When a slider moves the dialog updates instantly.
 *
 * Strictly a development helper — not part of the user-facing UI. Can be toggled via the
 * floating "DEBUG" button rendered alongside the dialog.
 */

export interface DebugState {
  // Section header
  sectionTitleSize: number
  sectionGap: number
  sectionPaddingTop: number
  sectionPaddingBottom: number
  // Grid item
  gridItemOutline: boolean
  gridItemMarginX: number
  gridItemMarginY: number
  gridItemPaddingX: number
  gridItemPaddingY: number
  commandIconSize: number
  iconTitleGap: number
  // Typography
  commandTitleSize: number
  commandTitleWeight: number
  commandTitleLineHeight: number
  commandDescriptionSize: number
  commandDescriptionOpacity: number
  commandDescriptionMarginLeft: number
  commandDescriptionLineHeight: number
  // Layout
  gridGap: number
  // Sort icon (group/list glyph in the search row)
  sortIconSize: number
  sortIconColor: string
  sortIconStroke: number
  sortIconOpacity: number
  // Search icon (magnifying glass in the search row)
  searchIconSize: number
  searchIconColor: string
  searchIconStroke: number
  searchIconOpacity: number
  // Header circular buttons (Back/Forward/Help/Close)
  buttonStrokeOpacity: number
  buttonShadowOpacity: number
  // Apply mix-blend-mode: plus-lighter to the search & sort icons so they additively
  // brighten against the dialog glass — same blend the gradient text uses, so the row
  // reads as one continuous luminous element.
  iconsPlusLighter: boolean
}

export const DEFAULT_DEBUG_STATE: DebugState = {
  sectionTitleSize: 1,
  sectionGap: 1,
  sectionPaddingTop: 1.25,
  sectionPaddingBottom: 1.25,
  gridItemOutline: false,
  gridItemMarginX: 0.2,
  gridItemMarginY: 0,
  gridItemPaddingX: 0,
  gridItemPaddingY: 0,
  commandIconSize: 20,
  iconTitleGap: 0.75,
  commandTitleSize: 0.75,
  commandTitleWeight: 500,
  commandTitleLineHeight: 1.35,
  commandDescriptionSize: 0.6875,
  commandDescriptionOpacity: 0.8,
  commandDescriptionMarginLeft: -0.2,
  commandDescriptionLineHeight: 1.3,
  gridGap: 0.5,
  // Sort icon picks up the *end* of the search input's text gradient (#D9D3D5 @ 50% alpha)
  // so the sort glyph and the right edge of the typed/placeholder text feel like a single
  // continuous tone across the row.
  sortIconSize: 28,
  sortIconColor: '#D9D3D5',
  sortIconStroke: 0,
  sortIconOpacity: 0.5,
  // Search icon picks up the *start* of the same gradient (#E3BECD), pairing with the sort
  // icon so the row reads as one tonal sweep from left (search) → text → right (sort).
  searchIconSize: 28,
  searchIconColor: '#E3BECD',
  searchIconStroke: 1.5,
  searchIconOpacity: 0.5,
  buttonStrokeOpacity: 0.35,
  buttonShadowOpacity: 0.05,
  iconsPlusLighter: true,
}

interface DebugContextValue {
  state: DebugState
  setValue: <K extends keyof DebugState>(key: K, value: DebugState[K]) => void
}

const DebugContext = createContext<DebugContextValue>({ state: DEFAULT_DEBUG_STATE, setValue: () => {} })

/** Hook for components inside the dialog tree to read the current debug state. */
export const useCommandUniverseDebug = () => useContext(DebugContext)

/** Wraps the dialog tree so its components can read live debug values. */
export const CommandUniverseDebugProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<DebugState>(DEFAULT_DEBUG_STATE)
  const setValue = <K extends keyof DebugState>(key: K, value: DebugState[K]) => {
    setState(prev => ({ ...prev, [key]: value }))
  }
  return <DebugContext.Provider value={{ state, setValue }}>{children}</DebugContext.Provider>
}

interface SliderConfig {
  tab: 'Section' | 'Grid Item' | 'Typography' | 'Layout' | 'Icons' | 'Buttons'
  key: keyof DebugState
  label: string
  min: number
  max: number
  step: number
  unit?: string
  type?: 'switch' | 'color'
}

const CONFIG: SliderConfig[] = [
  // Section
  { tab: 'Section', key: 'sectionTitleSize', label: 'Title size', min: 0.5, max: 2.5, step: 0.0625, unit: 'rem' },
  { tab: 'Section', key: 'sectionGap', label: 'Title↔line gap', min: 0, max: 3, step: 0.0625, unit: 'rem' },
  { tab: 'Section', key: 'sectionPaddingTop', label: 'Padding top', min: 0, max: 3, step: 0.0625, unit: 'rem' },
  { tab: 'Section', key: 'sectionPaddingBottom', label: 'Padding bottom', min: 0, max: 3, step: 0.0625, unit: 'rem' },
  // Grid Item
  { tab: 'Grid Item', key: 'gridItemOutline', label: 'Show outline box', min: 0, max: 1, step: 1, type: 'switch' },
  { tab: 'Grid Item', key: 'gridItemMarginX', label: 'Margin X', min: 0, max: 3, step: 0.0625, unit: 'rem' },
  { tab: 'Grid Item', key: 'gridItemMarginY', label: 'Margin Y', min: 0, max: 3, step: 0.0625, unit: 'rem' },
  { tab: 'Grid Item', key: 'gridItemPaddingX', label: 'Padding X', min: 0, max: 3, step: 0.0625, unit: 'rem' },
  { tab: 'Grid Item', key: 'gridItemPaddingY', label: 'Padding Y', min: 0, max: 3, step: 0.0625, unit: 'rem' },
  { tab: 'Grid Item', key: 'commandIconSize', label: 'Command icon size', min: 8, max: 64, step: 1, unit: 'px' },
  { tab: 'Grid Item', key: 'iconTitleGap', label: 'Icon↔title gap', min: 0, max: 2, step: 0.0625, unit: 'rem' },
  // Typography
  { tab: 'Typography', key: 'commandTitleSize', label: 'Title size', min: 0.5, max: 1.5, step: 0.0625, unit: 'rem' },
  { tab: 'Typography', key: 'commandTitleWeight', label: 'Title weight', min: 100, max: 900, step: 100 },
  {
    tab: 'Typography',
    key: 'commandTitleLineHeight',
    label: 'Title line-height',
    min: 0.8,
    max: 2,
    step: 0.05,
  },
  {
    tab: 'Typography',
    key: 'commandDescriptionSize',
    label: 'Description size',
    min: 0.5,
    max: 1.5,
    step: 0.0625,
    unit: 'rem',
  },
  {
    tab: 'Typography',
    key: 'commandDescriptionOpacity',
    label: 'Description opacity',
    min: 0,
    max: 1,
    step: 0.05,
  },
  {
    tab: 'Typography',
    key: 'commandDescriptionMarginLeft',
    label: 'Description margin-left',
    min: -0.5,
    max: 0.5,
    step: 0.0625,
    unit: 'rem',
  },
  {
    tab: 'Typography',
    key: 'commandDescriptionLineHeight',
    label: 'Description line-height',
    min: 0.8,
    max: 2,
    step: 0.05,
  },
  // Layout
  { tab: 'Layout', key: 'gridGap', label: 'Grid gap', min: 0, max: 3, step: 0.0625, unit: 'rem' },
  // Icons
  { tab: 'Icons', key: 'sortIconSize', label: 'Sort icon size', min: 8, max: 64, step: 1, unit: 'px' },
  // min/max/step ignored for color rows but the field is required by SliderConfig.
  { tab: 'Icons', key: 'sortIconColor', label: 'Sort icon color', min: 0, max: 0, step: 0, type: 'color' },
  { tab: 'Icons', key: 'sortIconStroke', label: 'Sort icon stroke', min: 0, max: 4, step: 0.1 },
  { tab: 'Icons', key: 'sortIconOpacity', label: 'Sort icon opacity', min: 0, max: 1, step: 0.05 },
  { tab: 'Icons', key: 'searchIconSize', label: 'Search icon size', min: 8, max: 64, step: 1, unit: 'px' },
  { tab: 'Icons', key: 'searchIconColor', label: 'Search icon color', min: 0, max: 0, step: 0, type: 'color' },
  { tab: 'Icons', key: 'searchIconStroke', label: 'Search icon stroke', min: 0, max: 4, step: 0.1 },
  { tab: 'Icons', key: 'searchIconOpacity', label: 'Search icon opacity', min: 0, max: 1, step: 0.05 },
  {
    tab: 'Icons',
    key: 'iconsPlusLighter',
    label: 'Plus-lighter blend',
    min: 0,
    max: 1,
    step: 1,
    type: 'switch',
  },
  // Buttons
  { tab: 'Buttons', key: 'buttonStrokeOpacity', label: 'Stroke opacity', min: 0, max: 1, step: 0.05 },
  { tab: 'Buttons', key: 'buttonShadowOpacity', label: 'Drop shadow opacity', min: 0, max: 1, step: 0.05 },
]

const TABS: SliderConfig['tab'][] = ['Section', 'Grid Item', 'Typography', 'Layout', 'Icons', 'Buttons']

/** Single slider/switch/color row. */
const Row: React.FC<{ config: SliderConfig }> = ({ config }) => {
  const { state, setValue } = useCommandUniverseDebug()
  const value = state[config.key]

  /** Pretty-print the live value next to the label. */
  const readout = (() => {
    if (config.type === 'switch') return (value as boolean) ? 'on' : 'off'
    if (config.type === 'color') return value as string
    return `${(value as number).toFixed(2)}${config.unit ?? ''}`
  })()

  return (
    <div
      className={css({
        display: 'flex',
        flexDirection: 'column',
        gap: '0.25rem',
        marginBottom: '0.5rem',
        fontSize: '11px',
      })}
    >
      <div className={css({ display: 'flex', justifyContent: 'space-between', alignItems: 'center' })}>
        <span>{config.label}</span>
        <span className={css({ opacity: 0.6, fontFamily: 'monospace' })}>{readout}</span>
      </div>
      {config.type === 'switch' ? (
        <input
          type='checkbox'
          checked={value as boolean}
          onChange={e => setValue(config.key, e.currentTarget.checked as DebugState[typeof config.key])}
        />
      ) : config.type === 'color' ? (
        <input
          type='color'
          value={value as string}
          onChange={e => setValue(config.key, e.currentTarget.value as DebugState[typeof config.key])}
          className={css({ width: '100%', height: '24px', border: 'none', background: 'transparent', padding: 0 })}
        />
      ) : (
        <input
          type='range'
          min={config.min}
          max={config.max}
          step={config.step}
          value={value as number}
          onChange={e => setValue(config.key, Number(e.currentTarget.value) as DebugState[typeof config.key])}
          className={css({ width: '100%' })}
        />
      )}
    </div>
  )
}

interface OverlayProps {
  open: boolean
  onClose: () => void
}

const Overlay: React.FC<OverlayProps> = ({ open, onClose }) => {
  const { state } = useCommandUniverseDebug()
  const [tab, setTab] = useState<SliderConfig['tab']>('Section')
  const [pos, setPos] = useState({ x: 16, y: 16 })
  const [copied, setCopied] = useState(false)

  if (!open) return null

  /**
   * Drag implementation: pointermove/pointerup are attached to `document` for the duration
   * of the drag rather than relying on `setPointerCapture` on the handle. Capture-based
   * dragging breaks here because each `setPos` re-render replaces the captured element, so
   * the next pointermove never reaches React. Document-level listeners are immune to that.
   */
  const onDragStart = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault()
    const startClientX = e.clientX
    const startClientY = e.clientY
    const startPosX = pos.x
    const startPosY = pos.y

    const onMove = (ev: PointerEvent) => {
      setPos({
        x: startPosX + (ev.clientX - startClientX),
        y: startPosY + (ev.clientY - startClientY),
      })
    }
    const onUp = () => {
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup', onUp)
      document.removeEventListener('pointercancel', onUp)
    }
    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup', onUp)
    document.addEventListener('pointercancel', onUp)
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(state, null, 2))
      setCopied(true)
      setTimeout(() => setCopied(false), 1200)
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <div
      style={{ left: pos.x, top: pos.y }}
      // Block native mousedown bubbling to `document` — Dialog.tsx attaches a `mousedown`
      // listener there that closes the dialog whenever the click target isn't inside
      // the dialog itself. React's `stopPropagation` only stops the synthetic bubble; the
      // native event still reaches document. Calling stopPropagation on the native event
      // here keeps the dialog open while interacting with the debug overlay.
      onMouseDown={e => e.nativeEvent.stopPropagation()}
      className={css({
        position: 'fixed',
        zIndex: 100000,
        width: '280px',
        background: 'rgba(20, 20, 28, 0.96)',
        color: '#fff',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        borderRadius: '10px',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
        fontFamily: 'system-ui, sans-serif',
        userSelect: 'none',
      })}
    >
      {/* Drag handle */}
      <div
        onPointerDown={onDragStart}
        className={css({
          padding: '0.5rem 0.75rem',
          cursor: 'grab',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          fontSize: '11px',
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
          opacity: 0.8,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          // Disables browser scroll/zoom gesture interception so pointer events fire reliably during drag.
          touchAction: 'none',
        })}
      >
        <span>⋮⋮ Debug · drag to move</span>
        <button
          type='button'
          onClick={onClose}
          className={css({
            background: 'transparent',
            border: 'none',
            color: '#fff',
            cursor: 'pointer',
            fontSize: '14px',
            padding: 0,
            lineHeight: 1,
          })}
        >
          ×
        </button>
      </div>
      {/* Tabs */}
      <div
        className={css({
          display: 'flex',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          fontSize: '11px',
        })}
      >
        {TABS.map(t => (
          <button
            key={t}
            type='button'
            onClick={() => setTab(t)}
            className={css({
              flex: 1,
              padding: '0.4rem',
              background: 'transparent',
              border: 'none',
              borderBottom: '2px solid transparent',
              color: '#fff',
              cursor: 'pointer',
            })}
            style={{
              borderBottomColor: t === tab ? '#63c9ea' : 'transparent',
              opacity: t === tab ? 1 : 0.5,
            }}
          >
            {t}
          </button>
        ))}
      </div>
      {/* Sliders */}
      <div className={css({ padding: '0.75rem', maxHeight: '50vh', overflowY: 'auto' })}>
        {CONFIG.filter(c => c.tab === tab).map(c => (
          <Row key={c.key} config={c} />
        ))}
      </div>
      {/* Copy */}
      <div className={css({ padding: '0.5rem 0.75rem', borderTop: '1px solid rgba(255, 255, 255, 0.1)' })}>
        <button
          type='button'
          onClick={copy}
          className={css({
            width: '100%',
            padding: '0.5rem',
            background: '#63c9ea',
            color: '#000',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: 600,
          })}
        >
          {copied ? 'Copied ✓' : 'COPY state'}
        </button>
      </div>
    </div>
  )
}

interface ToggleProps {
  open: boolean
  onToggle: () => void
}

const Toggle: React.FC<ToggleProps> = ({ open, onToggle }) => (
  <button
    type='button'
    // See note on Overlay's onMouseDown — same reason: prevent Dialog.tsx's
    // document-level click-outside handler from closing the dialog when this button is clicked.
    onMouseDown={e => e.nativeEvent.stopPropagation()}
    onClick={onToggle}
    className={css({
      position: 'fixed',
      bottom: '1rem',
      right: '1rem',
      zIndex: 100001,
      padding: '0.4rem 0.75rem',
      background: 'rgba(20, 20, 28, 0.85)',
      color: '#fff',
      border: '1px solid rgba(255, 255, 255, 0.2)',
      borderRadius: '999px',
      cursor: 'pointer',
      fontSize: '11px',
      fontFamily: 'system-ui, sans-serif',
      letterSpacing: '0.05em',
      textTransform: 'uppercase',
    })}
  >
    {open ? '× Debug' : '◐ Debug'}
  </button>
)

/**
 * Combined toggle button + overlay. Render as a sibling of the dialog inside the
 * CommandUniverseDebugProvider so both share the same context.
 */
export const CommandUniverseDebugUI: React.FC = () => {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Toggle open={open} onToggle={() => setOpen(o => !o)} />
      <Overlay open={open} onClose={() => setOpen(false)} />
    </>
  )
}
