// #4173: Ghost-click suppression state. On a rapid tap between adjacent thoughts, iOS Safari coalesces the
// two taps into a double-tap and emits a delayed, retargeted synthesized mousedown/click/dblclick on the
// previously-focused thought ~50-250ms after the second tap's touchend. That delayed mousedown would drive
// onMouseDown -> setCursor and yank the cursor back. We record the last real touchend (time + element); a
// genuine mousedown follows its own touchend within a few ms on the same element, whereas the ghost arrives
// later on a different thought, so it can be detected and dropped.
let lastTouchEndTime = 0
let lastTouchEndTarget: EventTarget | null = null
const GHOST_MOUSE_WINDOW_MS = 700

/** Tracks the last real touchend, so that events iOS synthesizes from it can be told from genuine ones. */
const lastTouch = {
  /** Records a real touchend. */
  record: (target: EventTarget): void => {
    lastTouchEndTime = performance.now()
    lastTouchEndTarget = target
  },

  /** Returns true if a real touchend ended recently enough that events still arriving may belong to it. */
  isRecent: (): boolean => performance.now() - lastTouchEndTime < GHOST_MOUSE_WINDOW_MS,

  /**
   * Returns true if the last real touchend recently landed on a DIFFERENT editable than `editable` — the
   * signature of iOS's rapid-tap retargeting (#4173).
   */
  isRetargeted: (editable: EventTarget): boolean =>
    !!lastTouchEndTarget &&
    lastTouchEndTarget !== editable &&
    performance.now() - lastTouchEndTime < GHOST_MOUSE_WINDOW_MS,
}

export default lastTouch
