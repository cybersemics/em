import type ThoughtUpdates from '../@types/ThoughtUpdates'
import type { DataProvider } from './DataProvider'
import createTreecrdtThoughtspace from './treecrdt/runtime'

export type PersistThoughtspaceBatch = Parameters<DataProvider['updateThoughts']>[0] & {
  local?: boolean
}

/** Storage lifetime requested from the active thoughtspace provider. */
export type ThoughtspaceStorage = 'memory' | 'persistent'

export type ThoughtspaceMaterializationBridge = {
  /** Invalidates publication when the receiving view is reset. */
  getGeneration: () => number
  /** Synchronously publishes committed data and confirms its writes before another storage job starts. */
  onCommit: (updates: ThoughtUpdates & { writeIds?: string[] }) => void
}

export type ThoughtspaceRuntimeInitOptions = {
  storage: ThoughtspaceStorage
  materialization?: ThoughtspaceMaterializationBridge
}

export type ThoughtspaceAccessBlockedReason = 'already-open' | 'unsupported'

export type ThoughtspaceAccessResult =
  { status: 'acquired' } | { status: 'blocked'; reason: ThoughtspaceAccessBlockedReason }

/** App-facing lifecycle interface for the active thoughtspace implementation. */
export interface ThoughtspaceRuntime {
  /** Acquires any runtime-specific access required before opening the interactive thoughtspace. */
  acquireAccess: () => Promise<ThoughtspaceAccessResult>
  init: (options: ThoughtspaceRuntimeInitOptions) => Promise<{ clientId: string; storage: string }>
  drop: () => Promise<unknown>
  waitForIdle: () => Promise<void>
  persistPushQueueBatches: (batches: readonly PersistThoughtspaceBatch[]) => Promise<void>
}

const treecrdtThoughtspace = createTreecrdtThoughtspace()

/** The active data provider backing the current app thoughtspace. */
export const db: DataProvider = treecrdtThoughtspace.db

/** The active thoughtspace runtime implementation. */
export const thoughtspaceRuntime: ThoughtspaceRuntime = treecrdtThoughtspace

export default db
