import { type TreecrdtClient, createTreecrdtClient } from '@treecrdt/wa-sqlite/client'
import { tsid } from '../yjs'

let client: TreecrdtClient | null = null

/** Initializes the TreeCRDT client with OPFS storage. */
export const initTreecrdt = async (): Promise<TreecrdtClient> => {
  client = await createTreecrdtClient({
    storage: 'opfs',
    docId: tsid,
    filename: `/treecrdt-em-${tsid}.db`,
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
    await client.close()
    client = null
  }
}

/** Drops storage and closes the TreeCRDT client. */
export const dropTreecrdt = async (): Promise<void> => {
  if (client) {
    await client.drop()
    client = null
  }
}

export default { initTreecrdt, getTreecrdtClient, closeTreecrdt, dropTreecrdt }
