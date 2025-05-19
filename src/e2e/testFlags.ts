/** Test flags that are injected into window.em.testFlags. */
const testFlags: {
  /** Delay in ms before expanding the hovering thought. */
  expandHoverDelay: number | null
  /** Render drop-hover elements as blocks of color. */
  simulateDrag: boolean
  /** Render drop targets as blocks of color. */
  simulateDrop: boolean
} = {
  /** Delay in ms before expanding the hovering thought. Set in drag-and-drop test.  If null, EXPAND_HOVER_DELAY is use instead. */
  expandHoverDelay: null,
  /** Render drop-hover elements as blocks of color. */
  simulateDrag: false,
  /** Render drop targets as blocks of color. */
  simulateDrop: false,
}
export default testFlags
