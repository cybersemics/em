/** Debug-only floating panel for tuning the sidebar dim/blur values when the section dropdown
 * is open. Position-fixed at bottom-right via a portal so it escapes any transformed ancestors.
 * Four sliders + reset: mask opacity floor (cross-browser dim), dropdown backdrop blur (Safari),
 * blur fade band (Safari edge softness), glow floor (SidebarOverlay1 expansion intensification).
 * Remove this file + its four call sites in Sidebar.tsx when done tuning. */
/* eslint-disable react-refresh/only-export-components */
import { useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import { isSafari } from '../browser'

type DebugState = {
  /** Cross-browser content dim. The mask alpha at full dropdown-open. 1 = no dim, 0.5 = current default. */
  maskOpacityFloor: number
  /** Safari-only blur strength on the dropdown panel's backdrop, in px. 0 disables. */
  dropdownBlurPx: number
  /** Safari-only soft-edge band on the dropdown blur backdrop (top + bottom), in px. */
  blurBandPx: number
  /** Resting opacity of the SidebarOverlay1 glow ramp. Lower = stronger pop when the dropdown opens. */
  glowFloor: number
}

const defaults: DebugState = {
  maskOpacityFloor: 0.5,
  dropdownBlurPx: isSafari() ? 8 : 0,
  blurBandPx: 48,
  glowFloor: 0.8,
}

let state = defaults
const listeners = new Set<() => void>()
/** Subscribe to debug state changes. Returns an unsubscribe function. */
const subscribe = (cb: () => void) => {
  listeners.add(cb)
  return () => {
    listeners.delete(cb)
  }
}
/** Read the current debug state. */
const getSnapshot = () => state
/** Merge a partial update into the debug state and notify listeners. */
const patch = (p: Partial<DebugState>) => {
  state = { ...state, ...p }
  listeners.forEach(l => l())
}
/** Reset all values to their defaults. */
const reset = () => {
  state = defaults
  listeners.forEach(l => l())
}

/** React hook returning the live debug state. Re-renders the caller on any change. */
export const useSidebarDebug = (): DebugState => useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

/** A single labelled slider row in the debug panel. */
const Row = ({
  label,
  value,
  min,
  max,
  step,
  format,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  format: (v: number) => string
  onChange: (v: number) => void
}) => (
  <label style={{ display: 'block', marginBottom: 10 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
      <span>{label}</span>
      <span style={{ opacity: 0.7 }}>{format(value)}</span>
    </div>
    <input
      type='range'
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={e => onChange(parseFloat(e.target.value))}
      style={{ display: 'block', width: '100%' }}
    />
  </label>
)

/** Floating, position-fixed panel of sliders that live-tune the sidebar dim/blur. */
const SidebarDebugPanel = () => {
  const { maskOpacityFloor, dropdownBlurPx, blurBandPx, glowFloor } = useSidebarDebug()
  if (typeof document === 'undefined') return null
  return createPortal(
    <div
      style={{
        position: 'fixed',
        bottom: 16,
        right: 16,
        zIndex: 2147483647,
        background: 'rgba(0,0,0,0.85)',
        color: '#fff',
        padding: '12px 14px',
        borderRadius: 8,
        fontFamily: 'system-ui, sans-serif',
        fontSize: 12,
        minWidth: 240,
        pointerEvents: 'auto',
        userSelect: 'none',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontWeight: 600 }}>Sidebar dim/blur debug</span>
        <button
          type='button'
          onClick={reset}
          style={{
            background: 'rgba(255,255,255,0.15)',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.25)',
            borderRadius: 4,
            padding: '2px 8px',
            fontSize: 11,
            cursor: 'pointer',
          }}
        >
          Reset
        </button>
      </div>
      <Row
        label='Mask opacity floor'
        value={maskOpacityFloor}
        min={0}
        max={1}
        step={0.05}
        format={v => v.toFixed(2)}
        onChange={v => patch({ maskOpacityFloor: v })}
      />
      <Row
        label='Dropdown blur (Safari)'
        value={dropdownBlurPx}
        min={0}
        max={32}
        step={1}
        format={v => `${v} px`}
        onChange={v => patch({ dropdownBlurPx: v })}
      />
      <Row
        label='Blur fade band (Safari)'
        value={blurBandPx}
        min={0}
        max={128}
        step={1}
        format={v => `${v} px`}
        onChange={v => patch({ blurBandPx: v })}
      />
      <Row
        label='Glow floor'
        value={glowFloor}
        min={0}
        max={1}
        step={0.05}
        format={v => v.toFixed(2)}
        onChange={v => patch({ glowFloor: v })}
      />
    </div>,
    document.body,
  )
}

export default SidebarDebugPanel
