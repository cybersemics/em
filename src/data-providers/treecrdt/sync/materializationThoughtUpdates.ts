import type { Change } from '@treecrdt/interface/engine'
import type Index from '../../../@types/IndexType'
import type Lexeme from '../../../@types/Lexeme'
import type Thought from '../../../@types/Thought'
import type ThoughtId from '../../../@types/ThoughtId'
import { ABSOLUTE_TOKEN, EM_TOKEN, GLOBAL_ROOT_TOKEN, HOME_TOKEN, ROOT_PARENT_ID } from '../../../constants'
import hashThought from '../../../util/hashThought'
import type { DataProvider } from '../../DataProvider'
import type { ThoughtspaceMaterializationSnapshot } from '../../thoughtspace'

/** Data-provider operations needed to persist materialized TreeCRDT changes. */
export type MaterializationStore = Pick<DataProvider, 'getLexemesByIds' | 'getThoughtById'>

export type MaterializationThoughtRefresh = {
  /** Thought ids removed from the tree. */
  deletedIds: ThoughtId[]
  /** Thoughts to merge into app state after materialization. */
  thoughts: Thought[]
  /** Lexeme rows for the refreshed thoughts' values. */
  lexemeIndexUpdates: Index<Lexeme | null>
}

const ROOT_THOUGHT_IDS = new Set<string>([GLOBAL_ROOT_TOKEN, ROOT_PARENT_ID, HOME_TOKEN, EM_TOKEN, ABSOLUTE_TOKEN])

/** Applies TreeCRDT sibling order to em's temporary rank projection for one parent. */
const addTreeOrderRankProjection = async (
  updates: Index<Thought>,
  db: MaterializationStore,
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

/** Collects affected ids from materialization changes, loads fresh thoughts + lexemes from the provider. */
export async function refreshThoughtsFromMaterializationChanges(
  changes: Change[],
  db: MaterializationStore,
  snapshot: ThoughtspaceMaterializationSnapshot,
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
        deleted.add(ch.node as ThoughtId)
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

  // An ancestor move can change the membership of descendants absent from the event.
  // An unloaded occurrence can also change value without a previous payload in the cache.
  const keys = [
    ...new Set([
      ...Object.keys(snapshot.lexemeIndex),
      ...thoughts.filter(thought => !ROOT_THOUGHT_IDS.has(thought.id)).map(thought => hashThought(thought.value)),
    ]),
  ]
  const lexemes = await db.getLexemesByIds(keys)
  const lexemeIndexUpdates = Object.fromEntries(keys.map((key, i) => [key, lexemes[i] ?? null]))

  return {
    deletedIds: [...deleted],
    thoughts,
    lexemeIndexUpdates,
  }
}
