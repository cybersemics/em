/** Debug flags that can be toggled at runtime from the browser console via `em.debugFlags`.
 * These are separate from testFlags which are for e2e test infrastructure.
 */
const debugFlags = {
  /** When true, logs one line per thought when its layout `top` (y) changes after the first layout pass — e.g. `[y] (empty)  shifted up 0.5px after first layout`. Cursor overlay duplicates are skipped. Enable: `em.debugFlags.yPosition = true`
   */
  yPosition: true,
}

export default debugFlags
