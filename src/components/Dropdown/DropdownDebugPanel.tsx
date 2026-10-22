import { ReactNode, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useSelector } from 'react-redux'
import { css } from '../../../styled-system/css'
import useBreakpoint from '../../hooks/useBreakpoint'
import storage from '../../util/storage'
import { DROPDOWN_Z_INDEX } from './Dropdown'
import { DIALS_EVENT } from './dials'

/*
 * TEMPORARY. A design-dials panel for tuning the Command Universe sort dropdown (see the design-dials skill). Every
 * control writes a --sort-dropdown-* custom property on <html> that Dropdown, DropdownRows, DropdownLight or
 * useSurfaceMask reads with the current design value as its fallback. Once the values are settled, bake them into
 * those fallbacks and delete this file, dials.ts, and its mount in AppComponent.
 *
 * Unlike the skill's default, this panel is mounted in every build except automated runs, not only in development:
 * it lives on a throwaway prototype branch and is tuned from the pull request's preview deployment.
 */

interface Control {
  /** The custom property this control writes. */
  name: string
  label: string
  /** Numeric controls also get a slider that writes `${value}${unit}`. Select controls choose from options. Text controls take any CSS value. */
  kind: 'number' | 'select' | 'text'
  min?: number
  max?: number
  step?: number
  unit?: string
  /** For select controls: the values to choose from, with a label each. */
  options?: { value: string; label: string }[]
  /** Shown as the placeholder so the baked-in fallback is visible beside the override. */
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
    ],
    fallback: 'down',
    hint: 'Around: the selected item stays on the button. Down: every item opens in the same place.',
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
    name: '--sort-dropdown-clear-radius',
    label: 'cleared space around the menu',
    kind: 'number',
    min: 0,
    max: 1200,
    step: 5,
    unit: 'px',
    fallback: '1200px | 575px across the surface',
    hint: 'How far the content fades out around the menu.',
  },
  {
    name: '--sort-dropdown-clear-strength',
    label: 'content left under the menu',
    kind: 'number',
    min: 0,
    max: 1,
    step: 0.01,
    fallback: '1',
    hint: '0 clears the space under the menu completely; 1 leaves the content there.',
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
    min: 0.3,
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
    max: 28,
    step: 0.25,
    unit: 'px',
    fallback: '17px',
  },
  {
    name: '--sort-dropdown-heading-font-size',
    label: '“Sort by…” font size',
    kind: 'number',
    min: 12,
    max: 28,
    step: 0.25,
    unit: 'px',
    fallback: '17.5px',
  },
  {
    name: '--sort-dropdown-row-padding',
    label: 'space between options',
    kind: 'number',
    min: 0,
    max: 20,
    step: 0.5,
    unit: 'px',
    fallback: '4px',
    hint: 'Padding above and below each option.',
  },
  {
    name: '--sort-dropdown-heading-gap',
    label: 'space under “Sort by…”',
    kind: 'number',
    min: 0,
    max: 40,
    step: 0.5,
    unit: 'px',
    fallback: '6px',
  },
  {
    name: '--sort-dropdown-separator-space',
    label: 'space around the separator',
    kind: 'number',
    min: 0,
    max: 40,
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
    max: 40,
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
  { id: 'paste', title: 'Overrides to paste back', note: 'for baking in', controls: [] },
]

const ALL_CONTROLS = SECTIONS.flatMap(section => section.controls)

const OPEN_SECTIONS_KEY = 'sortDropdownDials.openSections'
const VALUES_KEY = 'sortDropdownDials.values'

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

/** One labelled control: a slider or a choice, plus a free-form text input for the same custom property. */
const ControlRow = ({
  control,
  value,
  onChange,
}: {
  control: Control
  value: string
  onChange: (value: string) => void
}) => {
  const numeric = parseFloat(value || control.fallback)
  return (
    // minmax(0, 1fr): the long property names would otherwise widen the column past the panel.
    <label className={css({ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: '2px', marginBottom: '8px' })}>
      <span className={css({ opacity: 0.85 })}>
        {control.label} <code className={css({ opacity: 0.5, wordBreak: 'break-all' })}>{control.name}</code>
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

/** Stops a press inside the panel from reaching document-level listeners, which would close the dialog or menu. */
const stopPress = {
  onMouseDown: (event: React.SyntheticEvent) => event.stopPropagation(),
  onTouchStart: (event: React.SyntheticEvent) => event.stopPropagation(),
  onPointerDown: (event: React.SyntheticEvent) => event.stopPropagation(),
  onClick: (event: React.SyntheticEvent) => event.stopPropagation(),
}

/** The design-dials panel for the sort dropdown: shown over the Command Universe, or in a popup window. */
const DropdownDebugPanel = () => {
  const [values, setValues] = useState<Record<string, string>>(readValues)
  const [openSections, setOpenSections] = useState<string[]>(readOpenSections)
  const [popup, setPopup] = useState<Window | null>(null)
  // The sort dropdown lives in the Command Universe, so the inline panel only shows while it is open. The popup and
  // the overrides stay, so tuning can continue across closing and reopening it.
  const isCommandUniverseOpen = useSelector(state => state.showMobileCommandUniverse)
  // The Command Universe switches to its desktop layout at md (400px); each layout is tuned separately.
  const isDesktop = useBreakpoint('md')
  // The inline panel can be dragged larger or smaller from its corner grip and zoomed down out of the way. Pointer
  // events rather than CSS resize so it works on touch.
  const [panelSize, setPanelSize] = useState({ width: 280, height: Math.round(window.innerHeight * 0.7) })
  const [panelZoom, setPanelZoom] = useState(1)
  // Collapsed, the panel shrinks to its header so it doesn't block taps on the Command Universe beneath it.
  const [expanded, setExpanded] = useState(false)
  const panelResize = useRef<{ startX: number; startY: number; width: number; height: number } | null>(null)

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

  // Clear the overrides only when the panel unmounts.
  useEffect(
    () => () => {
      ALL_CONTROLS.forEach(control => document.documentElement.style.removeProperty(control.name))
      window.dispatchEvent(new Event(DIALS_EVENT))
    },
    [],
  )

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
  const heading = `Sort dropdown dials · ${layout}`

  const controls = (
    <>
      <div className={css({ display: 'flex', gap: '6px', margin: '6px 0' })}>
        <button type='button' onClick={() => copy(pasteText)} className={inputStyle}>
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
        Open the sort menu, then drag. Empty = current design value (shown as placeholder). Copy overrides and paste
        them into the pull request.
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
              <button type='button' onClick={() => copy(JSON.stringify(set, null, 2))} className={inputStyle}>
                Copy as JSON
              </button>
            </>
          ) : null}
        </CollapsibleSection>
      ))}
    </>
  )

  return (
    <>
      {isCommandUniverseOpen ? (
        <div
          {...stopPress}
          className={css({
            position: 'fixed',
            top: 'safeAreaTop',
            left: 0,
            transformOrigin: 'top left',
            fontSize: '11px',
            fontFamily: 'monospace',
            color: 'fg',
          })}
          // Above the dropdown's layers and its tap catcher, which sit at the dialog's z-index.
          style={{
            zIndex: DROPDOWN_Z_INDEX + 1,
            width: panelSize.width,
            height: expanded ? panelSize.height : undefined,
            transform: `scale(${panelZoom})`,
          }}
        >
          <details
            open={expanded}
            onToggle={event => setExpanded((event.currentTarget as HTMLDetailsElement).open)}
            className={css({
              boxSizing: 'border-box',
              width: '100%',
              maxHeight: '100%',
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
          {expanded ? (
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
          ) : null}
        </div>
      ) : null}
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

export default DropdownDebugPanel
