import { Clipboard } from '@capacitor/clipboard'
import { useEffect, useState } from 'react'
import { css } from '../../styled-system/css'
import {
  AutoscrollTechnique,
  getAutoscrollTechnique,
  setAutoscrollTechnique,
  subscribeAutoscrollTechnique,
} from '../util/autoscrollTechnique'
import {
  DebugAutoscrollLogEntry,
  clearDebugLog,
  getDebugLog,
  subscribeDebugLog,
} from '../util/debugAutoscrollLog'
import fastClick from '../util/fastClick'

/** Format entries oldest-first, one per line, for copying. */
const formatLog = (entries: DebugAutoscrollLogEntry[]) =>
  entries
    .slice()
    .reverse()
    .map(e => `+${String(e.dt).padStart(4, ' ')}ms ${e.tag}${e.data ? ' ' + e.data : ''}`)
    .join('\n')

/**
 * Temporary debug overlay for issue #3765.
 *
 * - Left pill (autoscroll: vN) — taps cycle the v1/v2 toggle.
 * - Right pill (log) — taps show/hide an in-app log of v2 events. Tap the log
 *   panel itself to clear.
 *
 * Persists in localStorage. Remove this component once the A/B is decided.
 */
const DebugAutoscrollToggle = () => {
  const [technique, setTechnique] = useState<AutoscrollTechnique>(getAutoscrollTechnique)
  const [showLog, setShowLog] = useState(false)
  const [entries, setEntries] = useState<DebugAutoscrollLogEntry[]>(getDebugLog)
  const [copied, setCopied] = useState(false)

  const onCopy = async () => {
    const text = formatLog(entries)
    // @capacitor/clipboard uses the native iOS pasteboard on Capacitor and falls back to
    // navigator.clipboard on web. WKWebView's navigator.clipboard is unreliable, so this is the
    // only path that works in iOS Capacitor.
    try {
      await Clipboard.write({ string: text })
      setCopied(true)
      setTimeout(() => setCopied(false), 1200)
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('clipboard copy failed', err)
    }
  }

  useEffect(() => subscribeAutoscrollTechnique(setTechnique), [])
  useEffect(
    () =>
      subscribeDebugLog(latest => {
        // copy so React sees a new reference
        setEntries(latest.slice())
      }),
    [],
  )

  return (
    <>
      {/* Toggle pills — top-right. Kept small to minimize occlusion. */}
      <div
        className={css({
          position: 'fixed',
          top: 'calc(env(safe-area-inset-top) + 4px)',
          right: '4px',
          zIndex: 9999,
          display: 'flex',
          gap: '4px',
        })}
      >
        <div
          {...fastClick(() => setAutoscrollTechnique(technique === 'v1' ? 'v2' : 'v1'))}
          className={css({
            padding: '6px 10px',
            borderRadius: '999px',
            fontSize: '11px',
            fontFamily: 'monospace',
            fontWeight: 'bold',
            background: technique === 'v2' ? '#2563eb' : '#444',
            color: 'white',
            boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
            userSelect: 'none',
            WebkitUserSelect: 'none',
            cursor: 'pointer',
            opacity: 0.85,
          })}
        >
          autoscroll: {technique}
        </div>
        <div
          {...fastClick(() => setShowLog(s => !s))}
          className={css({
            padding: '6px 10px',
            borderRadius: '999px',
            fontSize: '11px',
            fontFamily: 'monospace',
            fontWeight: 'bold',
            background: showLog ? '#16a34a' : '#444',
            color: 'white',
            boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
            userSelect: 'none',
            WebkitUserSelect: 'none',
            cursor: 'pointer',
            opacity: 0.85,
          })}
        >
          log {showLog ? '▼' : '▶'}
        </div>
      </div>

      {/* Log panel — top-right under the pills. Width-limited so thought text remains visible on the
          left. Top placement guarantees the keyboard never occludes the clear button. */}
      {showLog && (
        <div
          className={css({
            position: 'fixed',
            top: 'calc(env(safe-area-inset-top) + 44px)',
            right: '4px',
            zIndex: 9999,
            width: '60vw',
            maxWidth: '320px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            gap: '4px',
          })}
        >
          <div className={css({ display: 'flex', gap: '4px' })}>
            <div
              {...fastClick(onCopy)}
              className={css({
                padding: '4px 10px',
                borderRadius: '999px',
                fontSize: '11px',
                fontFamily: 'monospace',
                fontWeight: 'bold',
                background: copied ? '#16a34a' : '#2563eb',
                color: 'white',
                boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                userSelect: 'none',
                WebkitUserSelect: 'none',
                cursor: 'pointer',
                opacity: 0.9,
              })}
            >
              {copied ? '✓ copied' : '⧉ copy'}
            </div>
            <div
              {...fastClick(() => clearDebugLog())}
              className={css({
                padding: '4px 10px',
                borderRadius: '999px',
                fontSize: '11px',
                fontFamily: 'monospace',
                fontWeight: 'bold',
                background: '#dc2626',
                color: 'white',
                boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                userSelect: 'none',
                WebkitUserSelect: 'none',
                cursor: 'pointer',
                opacity: 0.9,
              })}
            >
              ✕ clear
            </div>
          </div>
          <div
            className={css({
              width: '100%',
              maxHeight: '50vh',
              overflowY: 'auto',
              padding: '6px 8px',
              borderRadius: '6px',
              background: 'rgba(0,0,0,0.85)',
              color: '#e5e7eb',
              fontSize: '10px',
              lineHeight: '1.3',
              fontFamily: 'monospace',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
              boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
            })}
          >
            {entries.length === 0 ? (
              <div className={css({ opacity: 0.5 })}>(no events — tap a thought)</div>
            ) : (
              entries.map(entry => (
                <div key={entry.id}>
                  <span className={css({ color: '#9ca3af' })}>+{String(entry.dt).padStart(4, ' ')}ms </span>
                  <span className={css({ color: '#fcd34d' })}>{entry.tag}</span>
                  {entry.data ? <span className={css({ color: '#cbd5e1' })}> {entry.data}</span> : null}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </>
  )
}

export default DebugAutoscrollToggle
