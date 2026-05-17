/** Test flags that are injected into window.em.testFlags. */
export type TestFlags = {
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
}

const testFlags: TestFlags = {
  logActions: false,
  logMultigesture: false,
  expandHoverDelay: null,
  replicationDelay: 0,
  simulateDrag: false,
  simulateDrop: false,
  layoutShiftObserverReady: false,
}

export default testFlags
