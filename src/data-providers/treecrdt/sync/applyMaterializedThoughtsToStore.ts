import type { MaterializationEvent } from '@treecrdt/interface/engine'
import type { TreecrdtClient } from '@treecrdt/wa-sqlite'
import _ from 'lodash'
import type Index from '../../../@types/IndexType'
import type Thought from '../../../@types/Thought'
import type { ThoughtspaceMaterializationBridge } from '../../thoughtspace'
import { refreshAttributeChildrenFromChanges } from '../attributeChildren'
import {
  getTreecrdtWriteBarrierVersion,
  isTreecrdtLocalMaterialization,
  waitForTreecrdtWriteBarrier,
} from '../writeBarrier'
import { enqueueMaterializedThoughtsToStoreWork, getMaterializedThoughtsToStoreVersion } from './materializationQueue'
import { type MaterializationStore, refreshThoughtsFromMaterializationChanges } from './materializationThoughtUpdates'

/** Dependencies captured when a client registers its materialization listener. */
type MaterializationContext = Readonly<{
  bridge?: ThoughtspaceMaterializationBridge
  client: TreecrdtClient
  db: MaterializationStore
}>

/** Serializes UI refreshes without putting index persistence behind the local-write barrier. */
const applyMaterializedThoughtsToStore = (
  event: MaterializationEvent,
  { bridge, client, db }: MaterializationContext,
  changedKeys: Promise<string[]>,
): Promise<void> =>
  enqueueMaterializedThoughtsToStoreWork(async () => {
    const keys = await changedKeys
    if (!bridge) return
    const local = isTreecrdtLocalMaterialization(event)
    if (!local) await refreshAttributeChildrenFromChanges(client, event.changes)

    // A later optimistic edit or materialization invalidates an asynchronous read. Retry from current storage.
    while (true) {
      await waitForTreecrdtWriteBarrier()
      const snapshot = bridge.getSnapshot()
      const writeVersion = getTreecrdtWriteBarrierVersion()
      const materializationVersion = getMaterializedThoughtsToStoreVersion()
      const thoughtIndexUpdates: Index<Thought | null> = {}
      if (!local) {
        const { deletedIds, thoughts } = await refreshThoughtsFromMaterializationChanges(event.changes, db)
        for (const id of deletedIds) thoughtIndexUpdates[id] = null
        for (const latest of thoughts) {
          const pending = snapshot.thoughtIndex[latest.id]?.pending || snapshot.thoughtIndex[latest.parentId]?.pending
          thoughtIndexUpdates[latest.id] = { ...latest, ...(pending ? { pending } : null) }
        }
      }
      const values = await db.getLexemesByIds(keys)
      const current = bridge.getSnapshot()
      if (
        snapshot.lexemeIndex !== current.lexemeIndex ||
        snapshot.thoughtIndex !== current.thoughtIndex ||
        writeVersion !== getTreecrdtWriteBarrierVersion() ||
        materializationVersion !== getMaterializedThoughtsToStoreVersion()
      )
        continue

      const lexemeIndexUpdates = Object.fromEntries(
        keys.flatMap((key, i) => (_.isEqual(values[i], snapshot.lexemeIndex[key]) ? [] : [[key, values[i] ?? null]])),
      )
      if (Object.keys(lexemeIndexUpdates).length > 0 || Object.keys(thoughtIndexUpdates).length > 0) {
        await bridge.apply({
          thoughtIndex: thoughtIndexUpdates,
          lexemeIndex: lexemeIndexUpdates,
        })
      }
      return
    }
  })

export default applyMaterializedThoughtsToStore
