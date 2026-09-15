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
  const touched = new Set<ThoughtId>()
  const orderParents = new Set<ThoughtId>()
  for (const ch of changes) {
    switch (ch.kind) {
      case 'insert':
        touched.add(ch.node as ThoughtId)
        touched.add(ch.parentAfter as ThoughtId)
        orderParents.add(ch.parentAfter as ThoughtId)
        break
      case 'move':
        touched.add(ch.node as ThoughtId)
        if (ch.parentBefore) {
          touched.add(ch.parentBefore as ThoughtId)
          orderParents.add(ch.parentBefore as ThoughtId)
        }
        touched.add(ch.parentAfter as ThoughtId)
        orderParents.add(ch.parentAfter as ThoughtId)
        break
      case 'delete':
        touched.add(ch.node as ThoughtId)
        if (ch.parentBefore) {
          touched.add(ch.parentBefore as ThoughtId)
          orderParents.add(ch.parentBefore as ThoughtId)
        }
        break
      case 'restore':
        touched.add(ch.node as ThoughtId)
        if (ch.parentAfter) {
          touched.add(ch.parentAfter as ThoughtId)
          orderParents.add(ch.parentAfter as ThoughtId)
        }
        break
      case 'payload':
        touched.add(ch.node as ThoughtId)
        break
    }
  }

  const thoughtIndexUpdates: Index<Thought | undefined> = {}

  for (const id of touched) {
    if (id === GLOBAL_ROOT_TOKEN) continue
    const thought = await db.getThoughtById(id)
    thoughtIndexUpdates[id] = thought
    // Events may have been coalesced or superseded while a local write was in flight.
    if (!thought) {
      deleted.add(id)
      continue
    }
    orderParents.add(thought.parentId)
  }

  // Moves also change sibling ranks. Read each affected parent/child once; the provider already derives its rank.
  for (const parentId of orderParents) {
    if (parentId === GLOBAL_ROOT_TOKEN) continue
    if (!(parentId in thoughtIndexUpdates)) thoughtIndexUpdates[parentId] = await db.getThoughtById(parentId)
    for (const childId of Object.values(thoughtIndexUpdates[parentId]?.childrenMap ?? {})) {
      if (!(childId in thoughtIndexUpdates)) thoughtIndexUpdates[childId] = await db.getThoughtById(childId)
    }
  }

  return {
    deletedIds: [...deleted],
    thoughts: Object.values(thoughtIndexUpdates).filter((thought): thought is Thought => !!thought),
  }
}
