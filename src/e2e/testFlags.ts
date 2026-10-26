import type Command from '../@types/Command'
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
  /** Keep every drop hover that becomes visible during the current drag mounted, so multiple drop hovers can be compared in a single snapshot. */
  pinDropHovers: boolean
  /** Render drop-hover elements as blocks of color. */
  simulateDrag: boolean
  /** Render drop targets as blocks of color. */
  simulateDrop: boolean
  /** Plain data for inert commands that replace the registered commands wherever the app lists or matches commands. Read once when the app loads, so it must be preloaded. See globalCommands in commands.ts. */
  commands: Pick<Command, 'label' | 'gesture' | 'keyboard' | 'description'>[] | null
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
  pinDropHovers: false,
  simulateDrag: false,
  simulateDrop: false,
  commands: preloadedTestFlags?.commands ?? null,
}

export default testFlags
