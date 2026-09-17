import type { Change, MaterializationEvent } from '@treecrdt/interface/engine'
import type Index from '../../../@types/IndexType'
import type Thought from '../../../@types/Thought'
import type ThoughtId from '../../../@types/ThoughtId'
import type ThoughtUpdates from '../../../@types/ThoughtUpdates'
import { GLOBAL_ROOT_TOKEN } from '../../../constants'
import type { DataProvider } from '../../DataProvider'
import type { ThoughtspaceMaterializationBridge } from '../../thoughtspace'
import { isStaleThoughtWrite, isStaleTreecrdtMaterialization } from '../writeBarrier'

/** Dependencies captured when a client registers its materialization listener. */
export type MaterializationContext = Readonly<{
  bridge?: ThoughtspaceMaterializationBridge
  db: Pick<DataProvider, 'getThoughtById' | 'getLexemesByIds'>
  pending: { event: MaterializationEvent; keys: string[]; generation: number | undefined }[]
}>

/** Collects affected ids from materialization changes and loads fresh thoughts from the provider. */
async function refreshThoughtsFromMaterializationChanges(
  changes: Change[],
  db: Pick<DataProvider, 'getThoughtById'>,
): Promise<{ deletedIds: ThoughtId[]; thoughts: Thought[] }> {
  const deleted = new Set<ThoughtId>()
  const changedNodes = new Set<ThoughtId>()
  const structuralNodes = new Set<ThoughtId>()
  const orderParents = new Set<ThoughtId>()
  for (const change of changes) {
    const id = change.node as ThoughtId
    changedNodes.add(id)
    if (change.kind !== 'payload') structuralNodes.add(id)
    if ('parentBefore' in change && change.parentBefore) orderParents.add(change.parentBefore as ThoughtId)
    if ('parentAfter' in change && change.parentAfter) orderParents.add(change.parentAfter as ThoughtId)
  }

  const parents = new Set(orderParents)
  const thoughtIndexUpdates: Index<Thought | undefined> = {}

  for (const id of changedNodes) {
    if (id === GLOBAL_ROOT_TOKEN) continue
    const thought = await db.getThoughtById(id)
    thoughtIndexUpdates[id] = thought
    // Events may have been coalesced or superseded while a local write was in flight.
    if (!thought) {
      deleted.add(id)
      continue
    }
    // Payload changes can rename attribute keys in the parent's childrenMap, but do not change sibling ranks.
    parents.add(thought.parentId)
    if (structuralNodes.has(id)) orderParents.add(thought.parentId)
  }

  // Refresh only affected parents and, for structural changes, their children. Do not walk up to ancestors.
  for (const parentId of parents) {
    if (parentId === GLOBAL_ROOT_TOKEN) continue
    if (!(parentId in thoughtIndexUpdates)) thoughtIndexUpdates[parentId] = await db.getThoughtById(parentId)
    if (!thoughtIndexUpdates[parentId]) deleted.add(parentId)
    if (!orderParents.has(parentId)) continue
    for (const childId of Object.values(thoughtIndexUpdates[parentId]?.childrenMap ?? {})) {
      if (!(childId in thoughtIndexUpdates)) thoughtIndexUpdates[childId] = await db.getThoughtById(childId)
    }
  }

  return {
    deletedIds: [...deleted],
    thoughts: Object.values(thoughtIndexUpdates).filter((thought): thought is Thought => !!thought),
  }
}

/** Publishes committed storage while the provider still owns the queue; the receiver handles its view state. */
const applyMaterializedThoughtsToStore = async (
  { bridge, db, pending }: MaterializationContext,
  confirmation?: { generation: number | undefined; writeIds: string[]; lexemeIndex: ThoughtUpdates['lexemeIndex'] },
): Promise<void> => {
  if (pending.length === 0 && !confirmation) return
  const generation = bridge?.getGeneration()
  const indexed = pending.splice(0)
  if (!bridge || generation === undefined) return
  const events = indexed.filter(
    entry => entry.generation === generation && !isStaleTreecrdtMaterialization(entry.event, generation),
  )
  const confirmed =
    confirmation?.generation === generation &&
    (confirmation.writeIds.length === 0 || !confirmation.writeIds.every(id => isStaleThoughtWrite(id, generation)))
      ? confirmation
      : undefined
  if (events.length === 0 && !confirmed) return
  const changes = events.flatMap(entry => entry.event.changes)
  // Local confirmations already contain the final memberships. Read only additional event keys.
  const keys = [...new Set(events.flatMap(entry => entry.keys))].filter(key => !(key in (confirmed?.lexemeIndex ?? {})))
  const { deletedIds, thoughts } = await refreshThoughtsFromMaterializationChanges(changes, db)
  const values = await db.getLexemesByIds(keys)

  // Storage cannot change during these reads, but the receiving view can be reset.
  if (bridge.getGeneration() !== generation) return
  const thoughtIndex: Index<Thought | null> = Object.fromEntries([
    ...deletedIds.map(id => [id, null]),
    ...thoughts.map(thought => [thought.id, thought]),
  ])
  const lexemeIndex = {
    ...confirmed?.lexemeIndex,
    ...Object.fromEntries(keys.map((key, i) => [key, values[i] ?? null])),
  }
  if (confirmed || Object.keys(lexemeIndex).length > 0 || Object.keys(thoughtIndex).length > 0) {
    bridge.onCommit({ thoughtIndex, lexemeIndex, writeIds: confirmed?.writeIds })
  }
}

export default applyMaterializedThoughtsToStore
