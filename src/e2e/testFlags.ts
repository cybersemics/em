import { DebouncedFunc } from 'lodash'
import type { ThoughtspaceStorage } from '../data-providers/thoughtspace'

type TestFlags = {
  logActions: boolean
  logMultigesture: boolean
  /** Delay in ms before expanding the hovering thought. */
  expandHoverDelay: number | null
  /** Delay in ms to mock data replication, for simulating network latency in tests. */
  replicationDelay: number
  /** Prevent automatic app initialization on page load. */
  preventInitialize: boolean
  /** Starts app initialization when preventInitialize is enabled. */
  initialize: ((options: { storage: ThoughtspaceStorage }) => Promise<unknown>) | null
  /** Overrides production thoughtspace storage during test startup. */
  thoughtspaceStorage: ThoughtspaceStorage | null
  /** Render drop-hover elements as blocks of color. */
  simulateDrag: boolean
  /** Render drop targets as blocks of color. */
  simulateDrop: boolean
  /** The throttled scrollCursorIntoView function. Exposed so that tests can cancel its pending trailing call before asserting on the scroll position. */
  throttledScrollCursorIntoView: DebouncedFunc<(y: number, height: number) => void> | null
}

const preloadedTestFlags = typeof window === 'undefined' ? null : (window.em?.testFlags ?? null)

/** Test flags that are injected into window.em.testFlags. */
const testFlags: TestFlags = {
  logActions: false,
  logMultigesture: false,
  expandHoverDelay: null,
  replicationDelay: preloadedTestFlags?.replicationDelay ?? 0,
  preventInitialize: preloadedTestFlags?.preventInitialize ?? false,
  initialize: null,
  thoughtspaceStorage: preloadedTestFlags?.thoughtspaceStorage ?? null,
  simulateDrag: false,
  simulateDrop: false,
  throttledScrollCursorIntoView: null,
}

export default testFlags
