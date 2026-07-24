/* eslint-disable import/prefer-default-export -- bridge module */
import type { MaterializationEvent } from '@treecrdt/interface/engine'
import type { TreecrdtClient } from '@treecrdt/wa-sqlite'
import type Index from '../../../@types/IndexType'
import type Lexeme from '../../../@types/Lexeme'
import type Thought from '../../../@types/Thought'
import type { ThoughtspaceMaterializationBridge } from '../../thoughtspace'
import { refreshAttributeChildrenFromChanges } from '../attributeChildren'
import { waitForTreecrdtWriteBarrier } from '../writeBarrier'
import { enqueueMaterializedThoughtsToStoreWork } from './materializationQueue'
import {
  type MaterializationDataProvider,
  refreshThoughtsFromMaterializationChanges,
} from './materializationThoughtUpdates'

/** Persists lexemes that em derives locally from materialized TreeCRDT thoughts. */
const persistDerivedLexemeUpdates = async (
  db: MaterializationDataProvider,
  lexemeIndexUpdates: Index<Lexeme | null>,
  schemaVersion: number,
): Promise<void> => {
  if (Object.keys(lexemeIndexUpdates).length === 0) return

  await db.updateThoughts({
    thoughtIndexUpdates: {},
    lexemeIndexUpdates,
    lexemeIndexUpdatesOld: {},
    schemaVersion,
  })
}

/**
 * After remote TreeCRDT ops are materialized into SQLite, refresh the app-facing thoughtspace in one batch.
 * This is used for cross-tab and server sync events; same-tab local writes are already applied optimistically.
 */
export async function applyMaterializedThoughtsToStore(
  event: MaterializationEvent,
  materialization: ThoughtspaceMaterializationBridge,
  client: TreecrdtClient,
  db: MaterializationDataProvider,
): Promise<void> {
  if (event.changes.length === 0) return

  // Local writes and materialization callbacks can race. Wait for queued em -> TreeCRDT writes before reading
  // SQLite back into app state, otherwise a remote refresh can reapply stale rows over newer optimistic state.
  await waitForTreecrdtWriteBarrier()

  await refreshAttributeChildrenFromChanges(client, event.changes)

  const snapshot = materialization.getSnapshot()
  const { deletedIds, thoughts, lexemeIndexUpdates } = await refreshThoughtsFromMaterializationChanges(
    event.changes,
    db,
    snapshot,
  )

  await persistDerivedLexemeUpdates(db, lexemeIndexUpdates, snapshot.schemaVersion)

  const thoughtIndexUpdates: Index<Thought | null> = {}

  for (const id of deletedIds) {
    thoughtIndexUpdates[id] = null
  }

  for (const latest of thoughts) {
    const thoughtInState = snapshot.thoughtIndex[latest.id]
    const parentInState = snapshot.thoughtIndex[latest.parentId]
    // Pending is not part of the TreeCRDT payload. Preserve the local UI flag until auth/sync handling owns it.
    const pending = thoughtInState?.pending || parentInState?.pending
    const latestWithPending = {
      ...latest,
      ...(pending ? { pending } : null),
    }

    thoughtIndexUpdates[latest.id] = latestWithPending
  }

  if (Object.keys(thoughtIndexUpdates).length > 0 || Object.keys(lexemeIndexUpdates).length > 0) {
    await materialization.apply({ thoughtIndexUpdates, lexemeIndexUpdates })
  }
}

/** Serializes materialization refreshes so overlapping async events cannot apply out of order. */
export function enqueueMaterializedThoughtsToStore(
  event: MaterializationEvent,
  materialization: ThoughtspaceMaterializationBridge,
  client: TreecrdtClient,
  db: MaterializationDataProvider,
): Promise<void> {
  return enqueueMaterializedThoughtsToStoreWork(() =>
    applyMaterializedThoughtsToStore(event, materialization, client, db),
  )
}
