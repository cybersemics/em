import type { Change } from '@treecrdt/interface/engine'
import type Index from '../../../@types/IndexType'
import type Thought from '../../../@types/Thought'
import type ThoughtId from '../../../@types/ThoughtId'
import { GLOBAL_ROOT_TOKEN } from '../../../constants'
import type { DataProvider } from '../../DataProvider'

/** Provider reads needed to refresh materialized TreeCRDT changes. */
export type MaterializationStore = Pick<DataProvider, 'getThoughtById' | 'getLexemesByIds'>

type MaterializationThoughtRefresh = {
  /** Thought ids removed from the tree. */
  deletedIds: ThoughtId[]
  /** Thoughts to merge into app state after materialization. */
  thoughts: Thought[]
}

/** Collects affected ids from materialization changes and loads fresh thoughts from the provider. */
export async function refreshThoughtsFromMaterializationChanges(
  changes: Change[],
  db: Pick<DataProvider, 'getThoughtById'>,
): Promise<MaterializationThoughtRefresh> {
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
