import { DebouncedFunc } from 'lodash'
import type { TreecrdtRuntimeConfig } from '../data-providers/treecrdt/runtime'

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
  initialize: (() => Promise<unknown>) | null
  /** Render drop-hover elements as blocks of color. */
  simulateDrag: boolean
  /** Render drop targets as blocks of color. */
  simulateDrop: boolean
  /** The throttled scrollCursorIntoView function. Exposed so that tests can cancel its pending trailing call before asserting on the scroll position. */
  throttledScrollCursorIntoView: DebouncedFunc<(y: number, height: number) => void> | null
  /** TreeCRDT runtime configuration injected before application modules load. */
  treecrdt: TreecrdtRuntimeConfig | null
}

const preloadedTestFlags =
  typeof window === 'undefined'
    ? null
    : ((window.em as { testFlags?: Partial<TestFlags> } | undefined)?.testFlags ?? null)

/** Test flags that are injected into window.em.testFlags. */
const testFlags: TestFlags = {
  logActions: false,
  logMultigesture: false,
  expandHoverDelay: null,
  replicationDelay: preloadedTestFlags?.replicationDelay ?? 0,
  preventInitialize: preloadedTestFlags?.preventInitialize ?? false,
  initialize: null,
  simulateDrag: false,
  simulateDrop: false,
  throttledScrollCursorIntoView: null,
  treecrdt: preloadedTestFlags?.treecrdt ?? null,
}

export default testFlags
