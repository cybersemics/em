import type { Change } from '@treecrdt/interface/engine'
import type Index from '../../../@types/IndexType'
import type Lexeme from '../../../@types/Lexeme'
import type Thought from '../../../@types/Thought'
import type ThoughtId from '../../../@types/ThoughtId'
import hashThought from '../../../util/hashThought'
import type { DataProvider } from '../../DataProvider'

export type MaterializationThoughtRefresh = {
  /** Thought ids removed from the tree. */
  deletedIds: ThoughtId[]
  /** Thoughts to merge into Redux (tree state after materialization). */
  thoughts: Thought[]
  /** Lexeme rows for the refreshed thoughts' values. */
  lexemeIndexUpdates: Index<Lexeme>
}

/** Collects affected ids from materialization changes, loads fresh thoughts + lexemes from the provider. */
export async function refreshThoughtsFromMaterializationChanges(
  changes: Change[],
  db: DataProvider,
): Promise<MaterializationThoughtRefresh> {
  const deleted = new Set<ThoughtId>()
  const touched = new Set<ThoughtId>()
  for (const ch of changes) {
    switch (ch.kind) {
      case 'insert':
        touched.add(ch.node as ThoughtId)
        touched.add(ch.parentAfter as ThoughtId)
        break
      case 'move':
        touched.add(ch.node as ThoughtId)
        if (ch.parentBefore) touched.add(ch.parentBefore as ThoughtId)
        touched.add(ch.parentAfter as ThoughtId)
        break
      case 'delete':
        deleted.add(ch.node as ThoughtId)
        if (ch.parentBefore) touched.add(ch.parentBefore as ThoughtId)
        break
      case 'restore':
        touched.add(ch.node as ThoughtId)
        if (ch.parentAfter) touched.add(ch.parentAfter as ThoughtId)
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
  const lexemeIndexUpdates: Index<Lexeme> = {}

  for (const id of touched) {
    const thought = await db.getThoughtById(id)
    if (!thought) continue
    thoughts.push(thought)
    const lexKey = hashThought(thought.value)
    const lex = await db.getLexemeById(lexKey)
    if (lex) lexemeIndexUpdates[lexKey] = lex
  }

  return {
    deletedIds: [...deleted],
    thoughts,
    lexemeIndexUpdates,
  }
}
