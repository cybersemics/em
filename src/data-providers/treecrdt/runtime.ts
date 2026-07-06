import type { Operation } from '@treecrdt/interface'
import type { DataProvider } from '../DataProvider'
import { initPermissionsStore } from '../permissionsStore'
import { clientIdReady } from '../thoughtspaceSession'
import { pushTreecrdtLocalOpsToRemote } from './sync'
import { getMaterializedThoughtsToStoreVersion, waitForMaterializedThoughtsToStore } from './sync/materializationQueue'
import treecrdtDb, { init as initTreecrdtThoughtspace } from './thoughtspace'
import { initTreecrdt } from './treecrdt'
import { getTreecrdtWriteBarrierVersion, waitForTreecrdtWriteBarrier, withTreecrdtWriteBarrier } from './writeBarrier'

type PersistTreecrdtBatch = Parameters<DataProvider['updateThoughts']>[0] & {
  local?: boolean
}

/** Converts the app client id to TreeCRDT's 32-byte replica id. */
const clientIdToReplicaId = (clientId: string): Uint8Array =>
  clientId.length === 44
    ? Uint8Array.from(atob(clientId), c => c.charCodeAt(0))
    : (() => {
        const bytes = new TextEncoder().encode(clientId)
        const replicaId = new Uint8Array(32)
        replicaId.set(bytes.subarray(0, 32))
        return replicaId
      })()

/** Persists push queue batches through TreeCRDT and forwards local ops to remote sync. */
const persistTreecrdtBatches = (batches: readonly PersistTreecrdtBatch[]): Promise<void> =>
  withTreecrdtWriteBarrier(async () => {
    for (const batch of batches) {
      const { local: isLocal, ...updates } = batch
      const maybeOps = await treecrdtDb.updateThoughts(updates)
      if (isLocal && Array.isArray(maybeOps) && maybeOps.length > 0) {
        void pushTreecrdtLocalOpsToRemote(maybeOps as readonly Operation[])
      }
    }
  })

/** TreeCRDT lifecycle implementation for the app thoughtspace runtime. */
export const treecrdtRuntime = {
  init: async (): Promise<{ clientId: string }> => {
    const clientId = await clientIdReady
    await initPermissionsStore()
    await initTreecrdt()
    await initTreecrdtThoughtspace(clientIdToReplicaId(clientId))
    return { clientId }
  },
  drop: () => treecrdtDb.clear(),
  waitForIdle: async (): Promise<void> => {
    let writeVersion: number
    let materializationVersion: number
    do {
      writeVersion = getTreecrdtWriteBarrierVersion()
      materializationVersion = getMaterializedThoughtsToStoreVersion()
      await waitForTreecrdtWriteBarrier()
      await waitForMaterializedThoughtsToStore()
    } while (
      writeVersion !== getTreecrdtWriteBarrierVersion() ||
      materializationVersion !== getMaterializedThoughtsToStoreVersion()
    )
  },
  persistTreecrdtBatches,
}

export default treecrdtRuntime
