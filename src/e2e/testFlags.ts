import { DebouncedFunc } from 'lodash'

/** Test flags that are injected into window.em.testFlags. */
const testFlags: {
  logActions: boolean
  logMultigesture: boolean
  /** Delay in ms before expanding the hovering thought. */
  expandHoverDelay: number | null
  /** Delay in ms to mock data replication, for simulating network latency in tests. */
  replicationDelay: number
  /** Render drop-hover elements as blocks of color. */
  simulateDrag: boolean
  /** Render drop targets as blocks of color. */
  simulateDrop: boolean
  /** Puppeteer layout-shift tests: true after `measureYShift`'s MutationObserver has called `observe()`. */
  layoutShiftObserverReady: boolean
  /** Puppeteer layout-shift tests: first `top` captured for the target tree-node. Set as soon as it is known. */
  layoutShiftInitialTop: number | null
  /** The throttled scrollCursorIntoView function. Exposed so that tests can cancel its pending trailing call before asserting on the scroll position. */
  throttledScrollCursorIntoView: DebouncedFunc<(y: number, height: number) => void> | null
} = {
  logActions: false,
  logMultigesture: false,
  expandHoverDelay: null,
  replicationDelay: 0,
  simulateDrag: false,
  simulateDrop: false,
  layoutShiftObserverReady: false,
  layoutShiftInitialTop: null,
  throttledScrollCursorIntoView: null,
}

export default testFlags
