import type { Change } from '@treecrdt/interface/engine'
import type Index from '../../../@types/IndexType'
import type Thought from '../../../@types/Thought'
import type ThoughtId from '../../../@types/ThoughtId'
import type { DataProvider } from '../../DataProvider'

/** Applies TreeCRDT sibling order to em's temporary rank projection for one parent. */
const addTreeOrderRankProjection = async (
  updates: Index<Thought>,
  db: Pick<DataProvider, 'getThoughtById'>,
  parentId: ThoughtId,
): Promise<void> => {
  const parent = await db.getThoughtById(parentId)
  if (!parent) return

  updates[parent.id] = parent

  const orderedChildIds = Object.values(parent.childrenMap || {})
  for (const [rank, childId] of orderedChildIds.entries()) {
    const child = await db.getThoughtById(childId)
    if (!child) continue
    updates[child.id] = {
      ...child,
      rank,
    }
  }
}

/** Collects affected ids from materialization changes, loads fresh thoughts from the provider. */
export default async function refreshThoughtsFromMaterializationChanges(
  changes: Change[],
  db: Pick<DataProvider, 'getThoughtById'>,
): Promise<{ deletedIds: ThoughtId[]; thoughts: Thought[] }> {
  const deleted = new Set<ThoughtId>()
  const touched = new Set<ThoughtId>()
  const orderParents = new Set<ThoughtId>()
  for (const ch of changes) {
    switch (ch.kind) {
      case 'insert':
        deleted.delete(ch.node as ThoughtId)
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
        deleted.add(ch.node as ThoughtId)
        if (ch.parentBefore) {
          touched.add(ch.parentBefore as ThoughtId)
          orderParents.add(ch.parentBefore as ThoughtId)
        }
        break
      case 'restore':
        deleted.delete(ch.node as ThoughtId)
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

  for (const id of deleted) {
    touched.delete(id)
  }

  const thoughts: Thought[] = []
  const thoughtIndexUpdates: Index<Thought> = {}

  for (const id of touched) {
    const thought = await db.getThoughtById(id)
    if (!thought) continue
    thoughtIndexUpdates[thought.id] = thought
    orderParents.add(thought.parentId)
  }

  // Current em selectors still sort by numeric rank. For remote/order-only TreeCRDT changes, derive a local rank
  // projection from the authoritative TreeCRDT child order without exposing TreeCRDT's internal order keys.
  // TODO: Remove when read-side selectors consume provider-backed sibling order instead of rank projection.
  for (const parentId of orderParents) {
    await addTreeOrderRankProjection(thoughtIndexUpdates, db, parentId)
  }

  for (const id of deleted) {
    delete thoughtIndexUpdates[id]
  }

  thoughts.push(...Object.values(thoughtIndexUpdates))

  return {
    deletedIds: [...deleted],
    thoughts,
  }
}
