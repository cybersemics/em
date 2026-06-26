import { initPermissionsStore } from '../permissionsStore'
import { clientIdReady } from '../thoughtspaceSession'
import { persistTreecrdtBatches } from './persistBatches'
import { getMaterializedThoughtsToStoreVersion, waitForMaterializedThoughtsToStore } from './sync/materializationQueue'
import treecrdtDb, { init as initTreecrdtThoughtspace } from './thoughtspace'
import { initTreecrdt } from './treecrdt'
import { getTreecrdtWriteBarrierVersion, waitForTreecrdtWriteBarrier } from './writeBarrier'

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
  persistPushQueueBatches: persistTreecrdtBatches,
}

export default treecrdtRuntime
