import type { MaterializationEvent } from '@treecrdt/interface/engine'
import _ from 'lodash'
import type { DataProvider } from '../../DataProvider'
import type { ThoughtspaceMaterializationBridge } from '../../thoughtspace'
import { isTreecrdtLocalMaterialization, waitForTreecrdtWriteBarrier } from '../writeBarrier'
import refreshThoughtsFromMaterializationChanges from './materializationThoughtUpdates'

export type MaterializationContext = {
  bridge: ThoughtspaceMaterializationBridge
  db: Pick<DataProvider, 'getThoughtById' | 'getLexemesByIds'>
  pending: { event: MaterializationEvent; keys: string[] }[]
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
    const keys = [...new Set(entries.flatMap(entry => entry.keys))]
    const remoteChanges = entries.flatMap(({ event }) => (isTreecrdtLocalMaterialization(event) ? [] : event.changes))
    const thoughtIndexUpdates = await refreshThoughtsFromMaterializationChanges(remoteChanges, db)
    for (const latest of _.compact(Object.values(thoughtIndexUpdates))) {
      const loading = snapshot.thoughtIndex[latest.id]?.pending || snapshot.thoughtIndex[latest.parentId]?.pending
      if (loading) thoughtIndexUpdates[latest.id] = { ...latest, pending: loading }
    }
    const values = await db.getLexemesByIds(keys)
    const current = bridge.getSnapshot()
    if (
      snapshot.lexemeIndex !== current.lexemeIndex ||
      snapshot.thoughtIndex !== current.thoughtIndex ||
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
