/**
 * Lightweight in-memory log for debugging issue #3765 v2 autoscroll path.
 * Logs are visible in the DebugAutoscrollToggle panel on-device, since iOS
 * Capacitor doesn't surface console output where we can read it.
 *
 * Remove this file once the A/B is decided.
 */
import { getAutoscrollTechnique } from './autoscrollTechnique'

export interface DebugAutoscrollLogEntry {
  /** Monotonic counter — used as React key and to spot dropped events. */
  id: number
  /** Ms since the previous entry, or 0 for the first. */
  dt: number
  /** Short tag identifying the call site. */
  tag: string
  /** Optional payload — kept short, since we render it on a 4-inch screen. */
  data?: string
}

const MAX_ENTRIES = 30

let nextId = 1
let lastTime = 0
const entries: DebugAutoscrollLogEntry[] = []
const listeners = new Set<(entries: DebugAutoscrollLogEntry[]) => void>()

/** Log a debug event. Drops events past MAX_ENTRIES (keeps newest). */
export const debugLog = (tag: string, data?: string) => {
  const now = performance.now()
  const dt = lastTime === 0 ? 0 : Math.round(now - lastTime)
  lastTime = now

  entries.unshift({ id: nextId++, dt, tag, data })
  if (entries.length > MAX_ENTRIES) entries.length = MAX_ENTRIES

  listeners.forEach(l => l(entries))
}

/** Snapshot of current entries (newest first). */
export const getDebugLog = () => entries

/** Subscribe to log changes. Returns unsubscribe. */
export const subscribeDebugLog = (listener: (entries: DebugAutoscrollLogEntry[]) => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** Clear all entries. */
export const clearDebugLog = () => {
  entries.length = 0
  nextId = 1
  lastTime = 0
  listeners.forEach(l => l(entries))
}

/**
 * Returns a short identifier for an editable element, suitable for log lines.
 * Prefers the first ~20 chars of its text content (collapsed whitespace).
 */
export const editableLabel = (el: Element | EventTarget | null | undefined): string => {
  if (!el || !(el instanceof Element)) return 'null'
  const text = (el.textContent ?? '').replace(/\s+/g, ' ').trim()
  if (!text) return '<empty>'
  return text.length > 20 ? text.slice(0, 20) + '…' : text
}

let scrollInstrumented = false
let scrollBurstActive = false
let scrollBurstStartY = 0
let scrollBurstTimer: ReturnType<typeof setTimeout> | undefined

/** True if v2 is active. Gating ensures v1 runs the patched paths but does not flood the log. */
const isLogActive = () => getAutoscrollTechnique() === 'v2'

/**
 * Patches HTMLElement.focus, Element.scrollIntoView, window.scrollTo/scrollBy and adds a
 * burst-clustered window.scroll listener. Use to identify what is causing native autoscroll
 * (or any scroll) when working on issue #3765. Idempotent.
 *
 * Patched calls log unconditionally so we can see if anything fires from v1 paths too, but
 * scroll bursts are noisy so they're gated on v2.
 */
export const installScrollInstrumentation = () => {
  if (scrollInstrumented || typeof window === 'undefined') return
  scrollInstrumented = true

  const originalFocus = HTMLElement.prototype.focus
  HTMLElement.prototype.focus = function (options) {
    const preventScroll = !!(options && typeof options === 'object' && options.preventScroll)
    if (isLogActive()) {
      debugLog('focus()', `el=${editableLabel(this)} preventScroll=${preventScroll}`)
    }
    return originalFocus.call(this, options)
  }

  const originalScrollIntoView = Element.prototype.scrollIntoView
  Element.prototype.scrollIntoView = function (arg?: boolean | ScrollIntoViewOptions) {
    if (isLogActive()) {
      debugLog('scrollIntoView', `el=${editableLabel(this)}`)
    }
    return originalScrollIntoView.call(this, arg as ScrollIntoViewOptions)
  }

  const originalScrollTo = window.scrollTo.bind(window)
  window.scrollTo = ((...args: unknown[]) => {
    if (isLogActive()) {
      const y = typeof args[0] === 'object' && args[0] !== null ? (args[0] as ScrollToOptions).top : args[1]
      debugLog('window.scrollTo', `y=${y}`)
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (originalScrollTo as any)(...args)
  }) as typeof window.scrollTo

  const originalScrollBy = window.scrollBy.bind(window)
  window.scrollBy = ((...args: unknown[]) => {
    if (isLogActive()) {
      debugLog('window.scrollBy', '')
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (originalScrollBy as any)(...args)
  }) as typeof window.scrollBy

  window.addEventListener(
    'scroll',
    () => {
      if (!isLogActive()) return
      if (!scrollBurstActive) {
        scrollBurstActive = true
        scrollBurstStartY = window.scrollY
        debugLog('scroll.start', `y=${window.scrollY.toFixed(0)}`)
      }
      clearTimeout(scrollBurstTimer)
      scrollBurstTimer = setTimeout(() => {
        const delta = window.scrollY - scrollBurstStartY
        debugLog('scroll.end', `y=${window.scrollY.toFixed(0)} Δ=${delta.toFixed(0)}`)
        scrollBurstActive = false
      }, 150)
    },
    { passive: true },
  )
}

/** Returns a one-liner describing the current DOM selection — focused node, offset, and whether it's collapsed. */
export const selectionSnapshot = (): string => {
  const sel = typeof window !== 'undefined' ? window.getSelection() : null
  if (!sel || sel.rangeCount === 0) return 'sel=none'
  const node = sel.focusNode
  const owner =
    node && node.nodeType === Node.TEXT_NODE
      ? (node.parentElement?.closest('[data-editable], [aria-label="note-editable"]') ?? node.parentElement)
      : node instanceof Element
        ? node.closest('[data-editable], [aria-label="note-editable"]')
        : null
  return `sel=${editableLabel(owner)}@${sel.focusOffset}${sel.isCollapsed ? '' : ' (range)'}`
}
