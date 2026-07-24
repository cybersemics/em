import type { Change } from '@treecrdt/interface/engine'
import type Index from '../../../@types/IndexType'
import type Lexeme from '../../../@types/Lexeme'
import type Thought from '../../../@types/Thought'
import type ThoughtId from '../../../@types/ThoughtId'
import type Timestamp from '../../../@types/Timestamp'
import { ABSOLUTE_TOKEN, EM_TOKEN, GLOBAL_ROOT_TOKEN, HOME_TOKEN, ROOT_PARENT_ID } from '../../../constants'
import hashThought from '../../../util/hashThought'
import type { DataProvider } from '../../DataProvider'
import type { ThoughtspaceMaterializationSnapshot } from '../../thoughtspace'

export type MaterializationDataProvider = Pick<DataProvider, 'getLexemeById' | 'getThoughtById' | 'updateThoughts'>

export type MaterializationThoughtRefresh = {
  /** Thought ids removed from the tree. */
  deletedIds: ThoughtId[]
  /** Thoughts to merge into app state after materialization. */
  thoughts: Thought[]
  /** Lexeme rows for the refreshed thoughts' values. */
  lexemeIndexUpdates: Index<Lexeme | null>
}

const ROOT_THOUGHT_IDS = new Set<string>([GLOBAL_ROOT_TOKEN, ROOT_PARENT_ID, HOME_TOKEN, EM_TOKEN, ABSOLUTE_TOKEN])

/** True when a thought should be represented as a Lexeme context. */
const isLexemeContextThought = (thought: Thought | undefined): thought is Thought =>
  !!thought && !ROOT_THOUGHT_IDS.has(thought.id)

/** Returns the latest timestamp while preserving the branded Timestamp type. */
const maxTimestamp = (...values: (Timestamp | number | undefined)[]): Timestamp =>
  Math.max(...values.map(value => value || 0)) as Timestamp

/** Gets the latest lexeme from already staged updates, app state, or the local derived lexeme table. */
const getCurrentLexeme = async (
  key: string,
  updates: Index<Lexeme | null>,
  snapshot: ThoughtspaceMaterializationSnapshot,
  db: MaterializationDataProvider,
): Promise<Lexeme | undefined> => {
  if (updates[key] === null) return undefined
  return updates[key] || snapshot.lexemeIndex[key] || (await db.getLexemeById(key))
}

/** Adds the thought id to the locally derived lexeme for the thought value. */
const addLexemeContext = async (
  updates: Index<Lexeme | null>,
  snapshot: ThoughtspaceMaterializationSnapshot,
  db: MaterializationDataProvider,
  thought: Thought,
): Promise<void> => {
  if (!isLexemeContextThought(thought)) return

  const key = hashThought(thought.value)
  const lexeme = await getCurrentLexeme(key, updates, snapshot, db)
  const contexts = [...(lexeme?.contexts || []).filter(id => id !== thought.id), thought.id]
  updates[key] = {
    contexts,
    created: lexeme?.created || thought.created,
    lastUpdated: maxTimestamp(lexeme?.lastUpdated, thought.lastUpdated),
    updatedBy: thought.updatedBy || lexeme?.updatedBy || '',
  }
}

/** Removes the thought id from the locally derived lexeme for the previous thought value. */
const removeLexemeContext = async (
  updates: Index<Lexeme | null>,
  snapshot: ThoughtspaceMaterializationSnapshot,
  db: MaterializationDataProvider,
  thought: Thought | undefined,
): Promise<void> => {
  if (!isLexemeContextThought(thought)) return

  const key = hashThought(thought.value)
  const lexeme = await getCurrentLexeme(key, updates, snapshot, db)
  if (!lexeme) return

  const contexts = lexeme.contexts.filter(id => id !== thought.id)
  updates[key] =
    contexts.length === 0
      ? null
      : {
          ...lexeme,
          contexts,
          lastUpdated: maxTimestamp(lexeme.lastUpdated, thought.lastUpdated),
          updatedBy: thought.updatedBy || lexeme.updatedBy,
        }
}

/** Applies TreeCRDT sibling order to em's temporary rank projection for one parent. */
const addTreeOrderRankProjection = async (
  updates: Index<Thought>,
  db: MaterializationDataProvider,
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
  db: MaterializationDataProvider,
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
  const lexemeIndexUpdates: Index<Lexeme | null> = {}

  for (const id of touched) {
    const thought = await db.getThoughtById(id)
    if (!thought) continue
    thoughtIndexUpdates[thought.id] = thought
    orderParents.add(thought.parentId)
    const previous = snapshot.thoughtIndex[id]
    if (previous && previous.value !== thought.value) {
      await removeLexemeContext(lexemeIndexUpdates, snapshot, db, previous)
    }
    await addLexemeContext(lexemeIndexUpdates, snapshot, db, thought)
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

  for (const id of deleted) {
    await removeLexemeContext(lexemeIndexUpdates, snapshot, db, snapshot.thoughtIndex[id])
  }

  return {
    deletedIds: [...deleted],
    thoughts,
    lexemeIndexUpdates,
  }
}
