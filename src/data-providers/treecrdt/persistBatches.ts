import type { Operation } from '@treecrdt/interface'
import type { DataProvider } from '../DataProvider'
import { pushTreecrdtLocalOpsToRemote } from './sync'
import treecrdtDb from './thoughtspace'
import { withTreecrdtWriteBarrier } from './writeBarrier'

export type PersistTreecrdtBatch = Parameters<DataProvider['updateThoughts']>[0] & {
  local?: boolean
}

/** Persists push queue batches through TreeCRDT and forwards local ops to remote sync. */
export const persistTreecrdtBatches = (batches: readonly PersistTreecrdtBatch[]): Promise<void> =>
  withTreecrdtWriteBarrier(async () => {
    for (const batch of batches) {
      const { local: isLocal, ...updates } = batch
      const maybeOps = await treecrdtDb.updateThoughts(updates)
      if (isLocal && Array.isArray(maybeOps) && maybeOps.length > 0) {
        void pushTreecrdtLocalOpsToRemote(maybeOps as readonly Operation[])
      }
    }
  })
