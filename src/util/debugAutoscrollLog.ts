/**
 * Lightweight in-memory log for debugging issue #3765 v2 autoscroll path.
 * Logs are visible in the DebugAutoscrollToggle panel on-device, since iOS
 * Capacitor doesn't surface console output where we can read it.
 *
 * Remove this file once the A/B is decided.
 */

export interface DebugAutoscrollLogEntry {
  /** Monotonic counter — used as React key and to spot dropped events. */
  id: number
  /** ms since the previous entry, or 0 for the first. */
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
