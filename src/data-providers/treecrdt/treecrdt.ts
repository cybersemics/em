import { type TreecrdtClient, createTreecrdtClient } from '@treecrdt/wa-sqlite/client'
import { tsid } from '../thoughtspaceSession'

let client: TreecrdtClient | null = null

const beforeCloseHandlers = new Set<() => Promise<void>>()

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

/** Initializes the TreeCRDT client with OPFS storage. */
export const initTreecrdt = async (): Promise<TreecrdtClient> => {
  client = await createTreecrdtClient({
    storage: {
      type: 'opfs',
      filename: `/treecrdt-em-${tsid}.db`,
      fallback: 'throw',
    },
    runtime: typeof SharedWorker === 'undefined' ? { type: 'auto' } : { type: 'shared-worker' },
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
