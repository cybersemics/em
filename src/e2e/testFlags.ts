import { DebouncedFunc } from 'lodash'

type PreloadedTestFlags = {
  thoughtspaceInitBlocker?: Promise<void>
}

// Some startup tests need flags before window.em exists. Puppeteer can set these with evaluateOnNewDocument
// so modules that run during app startup can read them immediately.
const preloadedTestFlags =
  typeof window === 'undefined'
    ? null
    : (window as Window & { __EM_TEST_FLAGS__?: PreloadedTestFlags }).__EM_TEST_FLAGS__

/** Test flags that are injected into window.em.testFlags. */
const testFlags: {
  logActions: boolean
  logMultigesture: boolean
  /** Delay in ms before expanding the hovering thought. */
  expandHoverDelay: number | null
  /** Delay in ms to mock data replication, for simulating network latency in tests. */
  replicationDelay: number
  /** Promise that blocks thoughtspace initialization until released by a startup test. */
  thoughtspaceInitBlocker: Promise<void> | null
  /** Render drop-hover elements as blocks of color. */
  simulateDrag: boolean
  /** Render drop targets as blocks of color. */
  simulateDrop: boolean
  /** The throttled scrollCursorIntoView function. Exposed so that tests can cancel its pending trailing call before asserting on the scroll position. */
  throttledScrollCursorIntoView: DebouncedFunc<(y: number, height: number) => void> | null
} = {
  logActions: false,
  logMultigesture: false,
  expandHoverDelay: null,
  replicationDelay: 0,
  thoughtspaceInitBlocker: preloadedTestFlags?.thoughtspaceInitBlocker ?? null,
  simulateDrag: false,
  simulateDrop: false,
  throttledScrollCursorIntoView: null,
}

export default testFlags
