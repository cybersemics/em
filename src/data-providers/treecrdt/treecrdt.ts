import {
  type ClientOptions,
  type RuntimeMode,
  type StorageMode,
  type TreecrdtClient,
  createTreecrdtClient,
} from '@treecrdt/wa-sqlite'
import { tsid } from '../thoughtspaceSession'

let client: TreecrdtClient | null = null

const beforeCloseHandlers = new Set<() => Promise<void>>()

/** App-level TreeCRDT client configuration. Omit it to use persistent browser defaults. */
export type TreecrdtClientConfig = Readonly<{
  storage: StorageMode
  runtime: RuntimeMode
  docId?: string
}>

/** Converts app-level configuration to the full TreeCRDT client options. */
const getClientOptions = (config?: TreecrdtClientConfig): ClientOptions => {
  const storage = config?.storage ?? 'opfs'

  return {
    storage:
      storage === 'memory'
        ? { type: 'memory' }
        : {
            type: 'opfs',
            filename: `/treecrdt-em-${tsid}.db`,
            fallback: 'throw',
          },
    runtime: { type: config?.runtime ?? (storage === 'memory' ? 'direct' : 'dedicated-worker') },
    docId: config?.docId ?? tsid,
  }
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

/** Initializes the TreeCRDT client. */
export const initTreecrdt = async (config?: TreecrdtClientConfig): Promise<TreecrdtClient> => {
  if (client) return client

  client = await createTreecrdtClient(getClientOptions(config))
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
