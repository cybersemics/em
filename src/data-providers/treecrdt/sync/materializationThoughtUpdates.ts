import type { Change } from '@treecrdt/interface/engine'
import type Index from '../../../@types/IndexType'
import type Thought from '../../../@types/Thought'
import type ThoughtId from '../../../@types/ThoughtId'
import type { DataProvider } from '../../DataProvider'

/** Collects affected ids from materialization changes, loads fresh thoughts from the provider. */
export default async function refreshThoughtsFromMaterializationChanges(
  changes: Change[],
  db: Pick<DataProvider, 'getThoughtById'>,
): Promise<Index<Thought | null>> {
  const deleted = new Set<ThoughtId>()
  const touched = new Set<ThoughtId>()
  /** Thoughts inserted, moved or restored, so their siblings' positions may have shifted. */
  const placed = new Set<ThoughtId>()
  const orderParents = new Set<ThoughtId>()
  for (const ch of changes) {
    switch (ch.kind) {
      case 'insert':
        deleted.delete(ch.node as ThoughtId)
        touched.add(ch.node as ThoughtId)
        placed.add(ch.node as ThoughtId)
        touched.add(ch.parentAfter as ThoughtId)
        orderParents.add(ch.parentAfter as ThoughtId)
        break
      case 'move':
        touched.add(ch.node as ThoughtId)
        placed.add(ch.node as ThoughtId)
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
        placed.add(ch.node as ThoughtId)
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

  const thoughtIndexUpdates: Index<Thought | null> = {}

  for (const id of touched) {
    const thought = await db.getThoughtById(id)
    if (!thought) continue
    thoughtIndexUpdates[thought.id] = thought
    // A rename moves no sibling, and a parent keeps its place when its children change.
    if (placed.has(id)) orderParents.add(thought.parentId)
  }

  // Current em selectors still sort by numeric rank. For remote/order-only TreeCRDT changes, derive a local rank
  // projection from the authoritative TreeCRDT child order without exposing TreeCRDT's internal order keys.
  // TODO: Remove when read-side selectors consume provider-backed sibling order instead of rank projection.
  for (const parentId of orderParents) {
    const parent = await db.getThoughtById(parentId)
    if (!parent) continue
    thoughtIndexUpdates[parent.id] = parent
    for (const [rank, childId] of Object.values(parent.childrenMap).entries()) {
      const child = await db.getThoughtById(childId)
      if (child) thoughtIndexUpdates[child.id] = { ...child, rank }
    }
  }

  for (const id of deleted) {
    thoughtIndexUpdates[id] = null
  }

  return thoughtIndexUpdates
}
