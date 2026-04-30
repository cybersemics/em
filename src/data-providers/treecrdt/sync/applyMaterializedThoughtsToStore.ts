/* eslint-disable import/prefer-default-export -- bridge module */
import type { MaterializationEvent } from '@treecrdt/interface/engine'
import type Thought from '../../../@types/Thought'
import { updateThoughtsActionCreator } from '../../../actions/updateThoughts'
import store from '../../../stores/app'
import thoughtspaceDb from '../thoughtspace'
import { refreshThoughtsFromMaterializationChanges } from './materializationThoughtUpdates'

/**
 * After remote TreeCRDT ops are materialized into SQLite, refresh Redux: deletes + lexeme rows,
 * then invoke `onThoughtChange` per updated thought (pending flags, etc.).
 */
export async function applyMaterializedThoughtsToStore(
  event: MaterializationEvent,
  onThoughtChange: (thought: Thought) => void,
): Promise<void> {
  if (event.changes.length === 0) return

  const { deletedIds, thoughts, lexemeIndexUpdates } = await refreshThoughtsFromMaterializationChanges(
    event.changes,
    thoughtspaceDb,
  )

  if (Object.keys(lexemeIndexUpdates).length > 0) {
    store.dispatch(
      updateThoughtsActionCreator({
        thoughtIndexUpdates: {},
        lexemeIndexUpdates,
        local: false,
        remote: false,
      }),
    )
  }

  if (deletedIds.length > 0) {
    store.dispatch(
      updateThoughtsActionCreator({
        thoughtIndexUpdates: Object.fromEntries(deletedIds.map(id => [id, null])),
        lexemeIndexUpdates: {},
        local: false,
        remote: false,
        repairCursor: true,
      }),
    )
  }

  for (const thought of thoughts) {
    const latest = await thoughtspaceDb.getThoughtById(thought.id)
    if (latest) onThoughtChange(latest)
  }
}
