import type { MaterializationEvent } from '@treecrdt/interface/engine'
import _ from 'lodash'
import type Index from '../../../@types/IndexType'
import type Thought from '../../../@types/Thought'
import type { DataProvider } from '../../DataProvider'
import type { ThoughtspaceMaterializationBridge } from '../../thoughtspace'
import {
  getTreecrdtWriteBarrierVersion,
  isTreecrdtLocalMaterialization,
  waitForTreecrdtWriteBarrier,
} from '../writeBarrier'
import { enqueueMaterializedThoughtsToStoreWork } from './materializationQueue'
import refreshThoughtsFromMaterializationChanges from './materializationThoughtUpdates'

export type MaterializationContext = {
  bridge: ThoughtspaceMaterializationBridge
  db: Pick<DataProvider, 'getThoughtById' | 'getLexemesByIds'>
  pending: { event: MaterializationEvent; keys: Promise<string[]> }[]
  isActive: () => boolean
}

/** Publishes complete memberships after persistence; local thoughts keep their optimistic view. */
export const applyMaterializedThoughtsToStore = async (context: MaterializationContext): Promise<void> => {
  const { bridge, db, pending, isActive } = context
  // Without per-write confirmations, a newer edit invalidates readback. Retry after its persistence completes.
  while (pending.length && isActive()) {
    await waitForTreecrdtWriteBarrier()
    const entries = pending.slice()
    const snapshot = bridge.getSnapshot()
    const writeVersion = getTreecrdtWriteBarrierVersion()
    const keys = [...new Set((await Promise.all(entries.map(entry => entry.keys))).flat())]
    const remoteChanges = entries.flatMap(({ event }) => (isTreecrdtLocalMaterialization(event) ? [] : event.changes))
    const thoughtIndexUpdates: Index<Thought | null> = {}
    if (remoteChanges.length) {
      const { deletedIds, thoughts } = await refreshThoughtsFromMaterializationChanges(remoteChanges, db)
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
      entries.length !== pending.length
    )
      continue
    if (!isActive()) return

    const lexemeIndexUpdates = Object.fromEntries(
      keys.flatMap((key, i) => (_.isEqual(values[i], snapshot.lexemeIndex[key]) ? [] : [[key, values[i] ?? null]])),
    )
    pending.splice(0, entries.length)
    if (Object.keys(lexemeIndexUpdates).length || Object.keys(thoughtIndexUpdates).length) {
      await bridge.apply({ thoughtIndex: thoughtIndexUpdates, lexemeIndex: lexemeIndexUpdates })
    }
  }
}

/** Coalesces materialization events behind the existing local-write barrier. */
export const enqueueMaterializedThoughtsToStore = (context: MaterializationContext): Promise<void> =>
  enqueueMaterializedThoughtsToStoreWork(() => applyMaterializedThoughtsToStore(context))
