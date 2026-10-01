import type { TreecrdtClient } from '@treecrdt/wa-sqlite'
import { EM_TOKEN, GLOBAL_ROOT_TOKEN, SETTINGS_TOKEN, SETTINGS_VALUE } from '../../constants'
import { encodeThoughtPayload } from './payload'
import { SYSTEM_ROOT_THOUGHT_IDS } from './systemThoughtIds'

/** Seeds the persistent tree without creating independent application indexes. */
const initializeMemoryStorage = async (client: TreecrdtClient, replicaId: Uint8Array): Promise<void> => {
  // The global root exists structurally, but needs a payload to be projected as a thought.
  if (!(await client.tree.getPayload(GLOBAL_ROOT_TOKEN))) {
    await client.local.payload(
      replicaId,
      GLOBAL_ROOT_TOKEN,
      encodeThoughtPayload({ value: GLOBAL_ROOT_TOKEN, created: 0, lastUpdated: 0, updatedBy: '' }),
    )
  }

  // Insert sequentially to preserve the established system-root order.
  for (const id of SYSTEM_ROOT_THOUGHT_IDS) {
    if (!(await client.tree.exists(id))) {
      const now = Date.now()
      await client.local.insert(
        replicaId,
        GLOBAL_ROOT_TOKEN,
        id,
        { type: 'last' },
        encodeThoughtPayload({ value: id, created: now, lastUpdated: now, updatedBy: '' }),
      )
    }
  }

  // A canonical Settings thought may have been renamed or moved. Preserve that existing document state.
  if (await client.tree.exists(SETTINGS_TOKEN)) return

  const now = Date.now()
  await client.local.insert(
    replicaId,
    EM_TOKEN,
    SETTINGS_TOKEN,
    { type: 'last' },
    encodeThoughtPayload({ value: SETTINGS_VALUE, created: now, lastUpdated: now, updatedBy: '' }),
  )
}

export default initializeMemoryStorage
