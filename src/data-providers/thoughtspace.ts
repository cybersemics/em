import type { DataProvider } from './DataProvider'
import { treecrdtRuntime } from './treecrdt/runtime'
import treecrdtDb from './treecrdt/thoughtspace'

export type PersistThoughtspaceBatch = Parameters<DataProvider['updateThoughts']>[0] & {
  local?: boolean
}

/** App-facing lifecycle interface for the active thoughtspace implementation. */
export interface ThoughtspaceRuntime {
  init: () => Promise<{ clientId: string }>
  drop: () => Promise<unknown>
  waitForIdle: () => Promise<void>
  persistPushQueueBatches: (batches: readonly PersistThoughtspaceBatch[]) => Promise<void>
}

/** The active data provider backing the current app thoughtspace. */
export const db: DataProvider = treecrdtDb

/** The active thoughtspace runtime implementation. */
export const thoughtspaceRuntime: ThoughtspaceRuntime = treecrdtRuntime

export default db
