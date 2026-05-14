/* eslint-disable import/prefer-default-export -- bridge module */
import type { MaterializationEvent } from '@treecrdt/interface/engine'
import type Index from '../../../@types/IndexType'
import type Thought from '../../../@types/Thought'
import { updateThoughtsActionCreator } from '../../../actions/updateThoughts'
import store from '../../../stores/app'
import thoughtspaceDb from '../thoughtspace'
import { waitForTreecrdtWriteBarrier } from '../writeBarrier'
import { refreshThoughtsFromMaterializationChanges } from './materializationThoughtUpdates'

/**
 * After remote TreeCRDT ops are materialized into SQLite, refresh Redux in one batch.
 * This is used for cross-tab and server sync events; same-tab local writes are already applied optimistically.
 */
export async function applyMaterializedThoughtsToStore(event: MaterializationEvent): Promise<void> {
  if (event.changes.length === 0) return

  // Local writes and materialization callbacks can race. Wait for queued em -> TreeCRDT writes before reading
  // SQLite back into Redux, otherwise a remote refresh can reapply stale rows over newer optimistic state.
  await waitForTreecrdtWriteBarrier()

  const stateBefore = store.getState()
  const { deletedIds, thoughts, lexemeIndexUpdates } = await refreshThoughtsFromMaterializationChanges(
    event.changes,
    thoughtspaceDb,
    stateBefore,
  )

  if (Object.keys(lexemeIndexUpdates).length > 0) {
    await thoughtspaceDb.updateThoughts({
      thoughtIndexUpdates: {},
      lexemeIndexUpdates,
      lexemeIndexUpdatesOld: {},
      schemaVersion: stateBefore.schemaVersion,
    })
  }

  const thoughtIndexUpdates: Index<Thought | null> = {}

  for (const id of deletedIds) {
    thoughtIndexUpdates[id] = null
  }

  for (const latest of thoughts) {
    const thoughtInState = stateBefore.thoughts.thoughtIndex[latest.id]
    const parentInState = stateBefore.thoughts.thoughtIndex[latest.parentId]
    // Pending is not part of the TreeCRDT payload. Preserve the local UI flag until auth/sync handling owns it.
    const pending = thoughtInState?.pending || parentInState?.pending
    const latestWithPending = {
      ...latest,
      ...(pending ? { pending } : null),
    }

    thoughtIndexUpdates[latest.id] = latestWithPending
  }

  if (Object.keys(thoughtIndexUpdates).length > 0 || Object.keys(lexemeIndexUpdates).length > 0) {
    store.dispatch(
      updateThoughtsActionCreator({
        thoughtIndexUpdates,
        lexemeIndexUpdates,
        local: false,
        remote: false,
        repairCursor: true,
      }),
    )
  }
}

let materializedThoughtsToStoreQueue = Promise.resolve()

/** Serializes materialization refreshes so overlapping async events cannot apply out of order. */
export function enqueueMaterializedThoughtsToStore(event: MaterializationEvent): Promise<void> {
  const apply = materializedThoughtsToStoreQueue.then(() => applyMaterializedThoughtsToStore(event))
  materializedThoughtsToStoreQueue = apply.catch(() => undefined)
  return apply
}
