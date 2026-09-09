/* eslint-disable import/prefer-default-export -- bridge module */
import type { MaterializationEvent } from '@treecrdt/interface/engine'
import type { TreecrdtClient } from '@treecrdt/wa-sqlite'
import type Index from '../../../@types/IndexType'
import type Thought from '../../../@types/Thought'
import type { ThoughtspaceMaterializationBridge } from '../../thoughtspace'
import { refreshAttributeChildrenFromChanges } from '../attributeChildren'
import {
  getTreecrdtWriteBarrierVersion,
  getTreecrdtWriteFailureVersion,
  waitForTreecrdtWriteBarrier,
  withTreecrdtWriteBarrier,
} from '../writeBarrier'
import { enqueueMaterializedThoughtsToStoreWork, getMaterializedThoughtsToStoreVersion } from './materializationQueue'
import { type MaterializationStore, refreshThoughtsFromMaterializationChanges } from './materializationThoughtUpdates'

/** Dependencies captured when a client registers its materialization listener. */
type MaterializationContext = Readonly<{
  bridge: ThoughtspaceMaterializationBridge
  client: TreecrdtClient
  db: MaterializationStore
  writeFailureVersion: number
}>

/**
 * After remote TreeCRDT ops are materialized into SQLite, refresh the app-facing thoughtspace in one batch.
 * This is used for cross-tab and server sync events; same-tab local writes are already applied optimistically.
 */
export async function applyMaterializedThoughtsToStore(
  event: MaterializationEvent,
  { bridge, client, db, writeFailureVersion }: MaterializationContext,
): Promise<void> {
  if (event.changes.length === 0) return

  let applied = false
  while (!applied) {
    // Surface failed local persistence rather than replacing an unsaved optimistic edit with stored rows.
    await waitForTreecrdtWriteBarrier()
    applied = await withTreecrdtWriteBarrier(async writeVersion => {
      // Writes queued behind this attempt must finish before we can read an authoritative snapshot.
      if (writeVersion !== getTreecrdtWriteBarrierVersion()) return false
      // Reporting a save error does not make stored rows authoritative again. Suspend this binding's
      // materialization rather than discard unsaved edits; an unrelated successful write cannot repair them.
      if (writeFailureVersion !== getTreecrdtWriteFailureVersion()) {
        throw new Error('TreeCRDT materialization suspended after a persistence failure.')
      }
      const materializationVersion = getMaterializedThoughtsToStoreVersion()
      const snapshot = bridge.getSnapshot()

      await refreshAttributeChildrenFromChanges(client, event.changes)
      const { deletedIds, thoughts, lexemeIndexUpdates } = await refreshThoughtsFromMaterializationChanges(
        event.changes,
        db,
        snapshot,
      )

      const current = bridge.getSnapshot()
      if (
        writeVersion !== getTreecrdtWriteBarrierVersion() ||
        materializationVersion !== getMaterializedThoughtsToStoreVersion() ||
        current.thoughtIndex !== snapshot.thoughtIndex ||
        current.lexemeIndex !== snapshot.lexemeIndex
      ) {
        return false
      }

      const thoughtIndexUpdates: Index<Thought | null> = {}
      for (const id of deletedIds) {
        thoughtIndexUpdates[id] = null
      }
      for (const latest of thoughts) {
        // Pending is UI state, not part of the TreeCRDT payload.
        const pending = snapshot.thoughtIndex[latest.id]?.pending || snapshot.thoughtIndex[latest.parentId]?.pending
        thoughtIndexUpdates[latest.id] = { ...latest, ...(pending ? { pending } : null) }
      }

      if (Object.keys(thoughtIndexUpdates).length > 0 || Object.keys(lexemeIndexUpdates).length > 0) {
        // Publish without yielding after validation. A local edit during the following cache write must see
        // these values, so its queued persistence removes the correct previous lexeme membership.
        bridge.apply({ thoughtIndex: thoughtIndexUpdates, lexemeIndex: lexemeIndexUpdates })
      }
      if (Object.keys(lexemeIndexUpdates).length > 0) {
        await db.updateThoughts({ thoughtIndexUpdates: {}, lexemeIndexUpdates, lexemeIndexUpdatesOld: {} })
      }
      return true
    })
    // Retry outside the write barrier, allowing any intervening local writes to persist first.
  }
}

/** Serializes materialization refreshes so overlapping async events cannot apply out of order. */
export function enqueueMaterializedThoughtsToStore(
  event: MaterializationEvent,
  context: MaterializationContext,
): Promise<void> {
  return enqueueMaterializedThoughtsToStoreWork(() => applyMaterializedThoughtsToStore(event, context))
}
