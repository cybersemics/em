import type { Operation } from '@treecrdt/interface'
import type { DataProvider } from '../DataProvider'
import { initPermissionsStore } from '../permissionsStore'
import type { ThoughtspaceRuntimeInitOptions } from '../thoughtspace'
import { clientIdReady } from '../thoughtspaceSession'
import { pushTreecrdtLocalOpsToRemote } from './sync'
import { getMaterializedThoughtsToStoreVersion, waitForMaterializedThoughtsToStore } from './sync/materializationQueue'
import treecrdtDb, { init as initTreecrdtThoughtspace } from './thoughtspace'
import { initTreecrdt } from './treecrdt'
import { getTreecrdtWriteBarrierVersion, waitForTreecrdtWriteBarrier, withTreecrdtWriteBarrier } from './writeBarrier'

type PersistTreecrdtBatch = Parameters<DataProvider['updateThoughts']>[0] & {
  local?: boolean
}

const TREECRDT_IDLE_TIMEOUT = 30000

/** Rejects if provider idle work never settles. */
const withIdleTimeout = (promise: Promise<void>): Promise<void> => {
  let timeoutId: ReturnType<typeof setTimeout> | undefined

  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error(`TreeCRDT idle wait timed out after ${TREECRDT_IDLE_TIMEOUT}ms`))
      }, TREECRDT_IDLE_TIMEOUT)
    }),
  ]).finally(() => {
    if (timeoutId) clearTimeout(timeoutId)
  })
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
const persistPushQueueBatches = (batches: readonly PersistTreecrdtBatch[]): Promise<void> =>
  withTreecrdtWriteBarrier(async () => {
    for (const batch of batches) {
      const { local: isLocal, ...updates } = batch
      const maybeOps = await treecrdtDb.updateThoughts(updates)
      if (isLocal && Array.isArray(maybeOps) && maybeOps.length > 0) {
        void pushTreecrdtLocalOpsToRemote(maybeOps as readonly Operation[])
      }
    }
  })

/** Waits until both local writes and materialization refreshes are stable. */
const waitForStableIdle = async (): Promise<void> => {
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
}

/** TreeCRDT lifecycle implementation for the app thoughtspace runtime. */
export const treecrdtRuntime = {
  init: async (options?: ThoughtspaceRuntimeInitOptions): Promise<{ clientId: string }> => {
    const clientId = await clientIdReady
    await initPermissionsStore()
    await initTreecrdt()
    await initTreecrdtThoughtspace(clientIdToReplicaId(clientId), options?.materialization)
    return { clientId }
  },
  drop: () => treecrdtDb.clear(),
  waitForIdle: (): Promise<void> => withIdleTimeout(waitForStableIdle()),
  persistPushQueueBatches,
}

export default treecrdtRuntime
