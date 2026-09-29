import touchStore from '../stores/touchStore'
import debugLog from './debugLog'

/** Returns the first two app frames of the current stack outside the selection helpers, so the log can name the caller. */
const caller = (): string | null => {
  const frames = (new Error().stack?.split('\n') ?? [])
    .filter(line => /\/src\//.test(line) && !/logProgrammaticSelection|device\/selection|device\/asyncFocus/.test(line))
    .slice(0, 2)
    .map(line => {
      const fn = line.split('@')[0].trim() || '?'
      const file = line.match(/\/src\/([^?:]+)/)?.[1]
      return `${fn}(${file})`
    })
  return frames.length ? frames.join(' < ') : null
}

/** Logs a selection or focus change that em makes itself while a touch has not ended. On iOS 27 a touch's touchend can be withheld, and em moving the selection or focus while that touch is still open is suspected of making iOS swallow the next quick tap (#5660). */
const logProgrammaticSelection = (op: string, target?: Node | null): void => {
  if (!debugLog.isEnabled() || touchStore.getState().touchEnded) return
  const el = target instanceof Element ? target : (target?.parentElement ?? null)
  const thought =
    el
      ?.closest('[data-editable]')
      ?.getAttribute('aria-label')
      ?.replace(/^editable-/, '') ?? null
  debugLog.log('emSelection', { op, thought, tag: el?.tagName ?? null, caller: caller() })
}

export default logProgrammaticSelection
