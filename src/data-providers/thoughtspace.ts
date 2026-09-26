import type ThoughtIndices from '../@types/ThoughtIndices'
import type DataProvider from './DataProvider'
import createMemoryThoughtspace from './treecrdt/createMemoryThoughtspace'

/** Storage lifetime requested from the active thoughtspace provider. */
export type ThoughtspaceStorage = 'memory' | 'persistent'

export type ThoughtspaceRuntimeInitOptions = {
  storage: ThoughtspaceStorage
  /** Publishes an immutable memory-engine projection; never a storage readback. */
  onChange?: (thoughts: ThoughtIndices) => void
  /** Reports a runtime failure that prevents accepting further document edits. */
  onError?: (error: Error) => void
}

export type ThoughtspaceAccessBlockedReason = 'already-open' | 'unsupported'

/** Lifecycle and persistence coordination for the active data provider. */
export interface ThoughtspaceRuntime {
  readonly ready: boolean
  acquireAccess: () => Promise<{ status: 'acquired' } | { status: 'blocked'; reason: ThoughtspaceAccessBlockedReason }>
  init: (options: ThoughtspaceRuntimeInitOptions) => Promise<{ clientId: string; storage: string }>
  drop: () => Promise<void>
  waitForIdle: () => Promise<void>
}

const treecrdtThoughtspace = createMemoryThoughtspace()

/** The active data provider backing the current app thoughtspace. */
export const db: DataProvider = treecrdtThoughtspace

/** The active thoughtspace runtime implementation. */
export const thoughtspaceRuntime: ThoughtspaceRuntime = treecrdtThoughtspace

export default db
