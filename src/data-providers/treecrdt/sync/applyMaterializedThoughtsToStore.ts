/* eslint-disable import/prefer-default-export -- bridge module */
import type { MaterializationEvent } from '@treecrdt/interface/engine'
import type Index from '../../../@types/IndexType'
import type Lexeme from '../../../@types/Lexeme'
import type Thought from '../../../@types/Thought'
import { updateThoughtsActionCreator } from '../../../actions/updateThoughts'
import store from '../../../stores/app'
import { refreshAttributeChildrenFromChanges } from '../attributeChildren'
import thoughtspaceDb from '../thoughtspace'
import { getTreecrdtClient } from '../treecrdt'
import { waitForTreecrdtWriteBarrier } from '../writeBarrier'
import { enqueueMaterializedThoughtsToStoreWork } from './materializationQueue'
import { refreshThoughtsFromMaterializationChanges } from './materializationThoughtUpdates'

/** Persists lexemes that em derives locally from materialized TreeCRDT thoughts. */
const persistDerivedLexemeUpdates = async (
  lexemeIndexUpdates: Index<Lexeme | null>,
  schemaVersion: number,
): Promise<void> => {
  if (Object.keys(lexemeIndexUpdates).length === 0) return

  await thoughtspaceDb.updateThoughts({
    thoughtIndexUpdates: {},
    lexemeIndexUpdates,
    lexemeIndexUpdatesOld: {},
    schemaVersion,
  })
}

/**
 * After remote TreeCRDT ops are materialized into SQLite, refresh Redux in one batch.
 * This is used for cross-tab and server sync events; same-tab local writes are already applied optimistically.
 */
export async function applyMaterializedThoughtsToStore(event: MaterializationEvent): Promise<void> {
  if (event.changes.length === 0) return

  // Local writes and materialization callbacks can race. Wait for queued em -> TreeCRDT writes before reading
  // SQLite back into Redux, otherwise a remote refresh can reapply stale rows over newer optimistic state.
  await waitForTreecrdtWriteBarrier()

  await refreshAttributeChildrenFromChanges(getTreecrdtClient(), event.changes)

  const stateBefore = store.getState()
  const { deletedIds, thoughts, lexemeIndexUpdates } = await refreshThoughtsFromMaterializationChanges(
    event.changes,
    thoughtspaceDb,
    stateBefore,
  )

  await persistDerivedLexemeUpdates(lexemeIndexUpdates, stateBefore.schemaVersion)

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

/** Serializes materialization refreshes so overlapping async events cannot apply out of order. */
export function enqueueMaterializedThoughtsToStore(event: MaterializationEvent): Promise<void> {
  return enqueueMaterializedThoughtsToStoreWork(() => applyMaterializedThoughtsToStore(event))
}
