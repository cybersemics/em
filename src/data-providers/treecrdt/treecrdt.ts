import { type ClientOptions, type TreecrdtClient, createTreecrdtClient } from '@treecrdt/wa-sqlite'
import storage from '../../util/storage'
import { tsid } from '../thoughtspaceSession'

let client: TreecrdtClient | null = null

const beforeCloseHandlers = new Set<() => Promise<void>>()

/** Creates an isolated in-memory document id for each Vitest TreeCRDT client. */
const createTestDocId = (): string => `${tsid}-test-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`

/** Creates the minimal test client needed by initialize without loading wa-sqlite assets in Vitest. */
const createTestTreecrdtClient = async (): Promise<TreecrdtClient> => {
  return createTreecrdtClient({
    storage: { type: 'memory' },
    runtime: { type: 'direct' },
    docId: createTestDocId(),
  })
}

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

  return { type: 'dedicated-worker' }
}

/** Initializes the TreeCRDT client. */
export const initTreecrdt = async (): Promise<TreecrdtClient> => {
  if (client) return client

  if (import.meta.env.MODE === 'test') {
    client = await createTestTreecrdtClient()
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
    // Tests may opt into memory storage when persistence is irrelevant. Persistent browser sessions use one
    // dedicated worker guarded by the page-lifetime session lock acquired before app initialization.
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
