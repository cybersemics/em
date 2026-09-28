// #4173: Ghost-click suppression state. On a rapid tap between adjacent thoughts, iOS Safari coalesces the
// two taps into a double-tap and emits a delayed, retargeted synthesized mousedown/click/dblclick on the
// previously-focused thought ~50-250ms after the second tap's touchend. That delayed mousedown would drive
// onMouseDown -> setCursor and yank the cursor back. We record the last real touchend (time + element); a
// genuine mousedown follows its own touchend within a few ms on the same element, whereas the ghost arrives
// later on a different thought, so it can be detected and dropped.
import ministore from '../../stores/ministore'

/** The last real touchend. A ministore rather than module variables so that resetStores clears it between tests: unit tests run well inside the window below, so a tap in one test would otherwise make the next test's genuine mousedown look like a ghost. Read imperatively; nothing subscribes. */
const lastTouchEndStore = ministore<{ time: number; target: EventTarget | null }>({ time: 0, target: null })
// A somewhat arbitrary window within which a mousedown following a touchend is considered part of the same interaction.
// If the last touch on this editable occurred outside this window, then the mouse event will be discarded.
const GHOST_MOUSE_WINDOW_MS = 700

/** Tracks the last real touchend, so that events iOS synthesizes from it can be told from genuine ones. */
const lastTouch = {
  /** Records a real touchend. */
  record: (target: EventTarget): void => {
    lastTouchEndStore.update({ time: performance.now(), target })
  },

  /** Returns true if a real touchend ended recently enough that events still arriving may belong to it. */
  isRecent: (): boolean => performance.now() - lastTouchEndStore.getState().time < GHOST_MOUSE_WINDOW_MS,

  /**
   * Returns true if the last real touchend recently landed on a DIFFERENT editable than `editable` — the
   * signature of iOS's rapid-tap retargeting (#4173).
   */
  isRetargeted: (editable: EventTarget): boolean => {
    const { time, target } = lastTouchEndStore.getState()
    return !!target && target !== editable && performance.now() - time < GHOST_MOUSE_WINDOW_MS
  },
}

export default lastTouch
