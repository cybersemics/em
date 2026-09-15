import type { MaterializationEvent } from '@treecrdt/interface/engine'
import type { TreecrdtClient } from '@treecrdt/wa-sqlite'
import _ from 'lodash'
import type Index from '../../../@types/IndexType'
import type Thought from '../../../@types/Thought'
import type ThoughtUpdates from '../../../@types/ThoughtUpdates'
import type { ThoughtspaceMaterializationBridge } from '../../thoughtspace'
import { refreshAttributeChildrenFromChanges } from '../attributeChildren'
import { isStaleTreecrdtMaterialization } from '../writeBarrier'
import { type MaterializationStore, refreshThoughtsFromMaterializationChanges } from './materializationThoughtUpdates'

/** Dependencies captured when a client registers its materialization listener. */
export type MaterializationContext = Readonly<{
  bridge?: ThoughtspaceMaterializationBridge
  client: TreecrdtClient
  db: MaterializationStore
  pending: { event: MaterializationEvent; keys: Promise<string[]>; generation: number | undefined }[]
}>

/** Publishes committed storage beneath current pending edits while the provider still owns the queue. */
const applyMaterializedThoughtsToStore = async (
  { bridge, client, db, pending }: MaterializationContext,
  confirmation?: { generation: number | undefined; writeIds: string[]; lexemeIndex: ThoughtUpdates['lexemeIndex'] },
): Promise<void> => {
  if (pending.length === 0 && !confirmation) return
  const generation = bridge?.getSnapshot().generation
  const indexed = await Promise.all(pending.splice(0).map(async entry => ({ ...entry, keys: await entry.keys })))
  // Derived storage indexes must also advance without a UI bridge or for an obsolete Redux generation.
  await refreshAttributeChildrenFromChanges(
    client,
    indexed.flatMap(entry => entry.event.changes),
  )
  if (!bridge || generation === undefined) return
  const events = indexed.filter(
    entry => entry.generation === generation && !isStaleTreecrdtMaterialization(entry.event, generation),
  )
  const confirmed = confirmation?.generation === generation ? confirmation : undefined
  if (events.length === 0 && !confirmed) return
  const changes = events.flatMap(entry => entry.event.changes)
  const keys = [...new Set(events.flatMap(entry => entry.keys))]
  const { deletedIds, thoughts } = await refreshThoughtsFromMaterializationChanges(changes, db)
  const values = await db.getLexemesByIds(keys)

  // Storage cannot change during these reads. Redux can: preserve its latest UI flags and pending intent.
  const current = bridge.getSnapshot()
  if (current.generation !== generation) return
  const thoughtIndex: Index<Thought | null> = Object.fromEntries(deletedIds.map(id => [id, null]))
  for (const latest of thoughts) {
    const previous = current.thoughtIndex[latest.id]
    const pending = previous?.pending || current.thoughtIndex[latest.parentId]?.pending
    thoughtIndex[latest.id] = {
      ...latest,
      ...(pending ? { pending } : null),
      ...(previous?.generating !== undefined ? { generating: previous.generating } : null),
      ...(previous?.splitSource !== undefined ? { splitSource: previous.splitSource } : null),
    }
  }
  const lexemeIndex = {
    ...confirmed?.lexemeIndex,
    ...Object.fromEntries(
      keys.flatMap((key, i) => (_.isEqual(values[i], current.lexemeIndex[key]) ? [] : [[key, values[i] ?? null]])),
    ),
  }
  if (confirmed || Object.keys(lexemeIndex).length > 0 || Object.keys(thoughtIndex).length > 0) {
    bridge.apply({ thoughtIndex, lexemeIndex, writeIds: confirmed?.writeIds })
  }
}

export default applyMaterializedThoughtsToStore
