import { type ClientOptions, type TreecrdtClient, createTreecrdtClient } from '@treecrdt/wa-sqlite/client'
import storage from '../../util/storage'
import { tsid } from '../thoughtspaceSession'

let client: TreecrdtClient | null = null

const beforeCloseHandlers = new Set<() => Promise<void>>()

/** Creates the minimal test client needed by initialize without loading wa-sqlite assets in Vitest. */
const createTestTreecrdtClient = (): TreecrdtClient =>
  ({
    mode: 'direct',
    runtime: 'direct',
    storage: 'memory',
    onMaterialized: () => () => undefined,
    close: async () => undefined,
    drop: async () => undefined,
  }) as unknown as TreecrdtClient

/** Runs before `client.close()` / `client.drop()` (e.g. tear down WebSocket sync). Returns an unregister function. */
export const registerBeforeTreecrdtClose = (handler: () => Promise<void>): (() => void) => {
  beforeCloseHandlers.add(handler)
  return () => {
    beforeCloseHandlers.delete(handler)
  }
}

/** Invokes all registered pre-close handlers (e.g. sync teardown). */
async function runBeforeTreecrdtClose(): Promise<void> {
  const handlers = [...beforeCloseHandlers]
  beforeCloseHandlers.clear()
  await Promise.all(handlers.map(h => h()))
}

/** Gets the configured TreeCRDT runtime for persistent browser sessions. */
const getRuntime = (): NonNullable<ClientOptions['runtime']> => {
  const runtimeOverride = storage.getItem('treecrdtRuntime')

  if (runtimeOverride === 'direct' || runtimeOverride === 'dedicated-worker' || runtimeOverride === 'shared-worker') {
    return { type: runtimeOverride }
  }

  return typeof SharedWorker === 'undefined' ? { type: 'auto' } : { type: 'shared-worker' }
}

/** Initializes the TreeCRDT client. */
export const initTreecrdt = async (): Promise<TreecrdtClient> => {
  if (import.meta.env.MODE === 'test') {
    client = createTestTreecrdtClient()
    return client
  }

  const useTransientMemory = storage.getItem('treecrdtStorage') === 'memory'

  client = await createTreecrdtClient({
    storage: useTransientMemory
      ? { type: 'memory' }
      : {
          type: 'opfs',
          filename: `/treecrdt-em-${tsid}.db`,
          fallback: 'throw',
        },
    // Tests may opt into memory storage when persistence is irrelevant. Normal browser sessions use SharedWorker+OPFS
    // so the one-store-across-tabs path remains the default behavior.
    runtime: useTransientMemory ? { type: 'direct' } : getRuntime(),
    docId: tsid,
  })
  return client
}

/** Returns the initialized TreeCRDT client. */
export const getTreecrdtClient = (): TreecrdtClient => {
  if (!client) throw new Error('TreeCRDT client not initialized. Call initTreecrdt() first.')
  return client
}

/** Closes the TreeCRDT client. */
export const closeTreecrdt = async (): Promise<void> => {
  if (client) {
    await runBeforeTreecrdtClose()
    await client.close()
    client = null
  }
}

/** Drops storage and closes the TreeCRDT client. */
export const dropTreecrdt = async (): Promise<void> => {
  if (client) {
    await runBeforeTreecrdtClose()
    await client.drop()
    client = null
  }
}

export default { initTreecrdt, getTreecrdtClient, closeTreecrdt, dropTreecrdt, registerBeforeTreecrdtClose }
