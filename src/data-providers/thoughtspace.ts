import type Index from '../@types/IndexType'
import type Lexeme from '../@types/Lexeme'
import type Thought from '../@types/Thought'
import bootstrapConfig from '../bootstrapConfig'
import type { DataProvider } from './DataProvider'
import createTreecrdtThoughtspace from './treecrdt/runtime'

export type PersistThoughtspaceBatch = Parameters<DataProvider['updateThoughts']>[0] & {
  local?: boolean
}

/** Storage lifetime requested from the active thoughtspace provider. */
export type ThoughtspaceStorage = 'memory' | 'persistent'

export type ThoughtspaceMaterializationSnapshot = {
  schemaVersion: number
  thoughtIndex: Index<Thought>
  lexemeIndex: Index<Lexeme>
}

export type ThoughtspaceMaterializedUpdates = {
  thoughtIndexUpdates: Index<Thought | null>
  lexemeIndexUpdates: Index<Lexeme | null>
}

export type ThoughtspaceMaterializationBridge = {
  getSnapshot: () => ThoughtspaceMaterializationSnapshot
  apply: (updates: ThoughtspaceMaterializedUpdates) => void | Promise<void>
}

export type ThoughtspaceRuntimeInitOptions = {
  materialization?: ThoughtspaceMaterializationBridge
}

export type ThoughtspaceAccessBlockedReason = 'already-open' | 'unsupported'

export type ThoughtspaceAccessResult =
  { status: 'acquired' } | { status: 'blocked'; reason: ThoughtspaceAccessBlockedReason }

/** App-facing lifecycle interface for the active thoughtspace implementation. */
export interface ThoughtspaceRuntime {
  /** Acquires any runtime-specific access required before opening the interactive thoughtspace. */
  acquireAccess: () => Promise<ThoughtspaceAccessResult>
  init: (options?: ThoughtspaceRuntimeInitOptions) => Promise<{ clientId: string }>
  drop: () => Promise<unknown>
  waitForIdle: () => Promise<void>
  persistPushQueueBatches: (batches: readonly PersistThoughtspaceBatch[]) => Promise<void>
}

const treecrdtThoughtspace = createTreecrdtThoughtspace(bootstrapConfig.treecrdt)

/** The active data provider backing the current app thoughtspace. */
export const db: DataProvider = treecrdtThoughtspace.db

/** The active thoughtspace runtime implementation. */
export const thoughtspaceRuntime: ThoughtspaceRuntime = treecrdtThoughtspace

export default db
