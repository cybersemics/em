import type { Operation } from '@treecrdt/interface'
import type Index from '../../@types/IndexType'
import type Lexeme from '../../@types/Lexeme'
import type Thought from '../../@types/Thought'
import type ThoughtId from '../../@types/ThoughtId'
import type { DataProvider } from '../DataProvider'
import { createTestSystemThoughtIndexes } from './systemThoughtIds'

let replicaId: Uint8Array | null = null
let testThoughtIndex: Index<Thought> = {}
let testLexemeIndex: Index<Lexeme> = {}

/** Seeds the in-memory test provider with TreeCRDT's fixed system thoughts. */
const seedSystemThoughts = (): void => {
  const seed = createTestSystemThoughtIndexes()
  testThoughtIndex = {
    ...seed.thoughtIndex,
    ...testThoughtIndex,
  }
  testLexemeIndex = {
    ...seed.lexemeIndex,
    ...testLexemeIndex,
  }
}

/** Resets the in-memory TreeCRDT provider used by unit tests. */
export const resetTestThoughtspace = (): void => {
  testThoughtIndex = {}
  testLexemeIndex = {}
  replicaId = null
}

/** Session replica identity (passed to `init`); minted ops use this for correct CRDT attribution. */
export function getThoughtspaceReplicaId(): Uint8Array {
  if (!replicaId) throw new Error('TreeCRDT test DataProvider: init not called')
  return replicaId
}

/** Fetches a thought by ID from the in-memory test tree. */
const getThoughtById = async (id: ThoughtId): Promise<Thought | undefined> => testThoughtIndex[id]

/** Fetches multiple thoughts by IDs. */
const getThoughtsByIds = (ids: ThoughtId[]): Promise<(Thought | undefined)[]> => Promise.all(ids.map(getThoughtById))

/** Applies thought and lexeme updates to the in-memory test tree. */
const updateThoughts = async ({
  thoughtIndexUpdates,
  lexemeIndexUpdates,
}: {
  thoughtIndexUpdates: Index<Thought | null>
  lexemeIndexUpdates: Index<Lexeme | null>
  lexemeIndexUpdatesOld: Index<Lexeme | undefined>
  schemaVersion: number
  movePlacements?: Index<ThoughtId | null>
}): Promise<readonly Operation[]> => {
  if (!replicaId) return []

  for (const [id, lexeme] of Object.entries(lexemeIndexUpdates)) {
    if (lexeme === null) {
      delete testLexemeIndex[id]
    } else {
      testLexemeIndex[id] = lexeme
    }
  }

  for (const [id, thought] of Object.entries(thoughtIndexUpdates)) {
    if (thought === null) {
      delete testThoughtIndex[id]
    } else {
      testThoughtIndex[id] = thought
    }
  }

  return []
}

/** No-op for freeing a thought. */
const freeThought = async (_id: ThoughtId): Promise<void> => {
  // no-op
}

/** Removes a lexeme row from the in-memory test tree. */
const freeLexeme = async (key: string): Promise<void> => {
  delete testLexemeIndex[key]
}

/** Clears the in-memory test thoughtspace. */
const clear = async (): Promise<void> => {
  resetTestThoughtspace()
}

/** Loads a lexeme by hash key from the in-memory test tree. */
const getLexemeById = async (key: string): Promise<Lexeme | undefined> => testLexemeIndex[key]

/** Loads lexemes for hash keys in parallel order. */
const getLexemesByIds = async (keys: string[]): Promise<(Lexeme | undefined)[]> => keys.map(key => testLexemeIndex[key])

/** Replaces all stored lexemes with the given index. */
const updateLexemeIndex = async (lexemeIndex: Index<Lexeme>): Promise<void> => {
  testLexemeIndex = { ...lexemeIndex }
}

/** Replaces all stored thoughts with the given index. */
const updateThoughtIndex = async (thoughtIndex: Index<Thought>): Promise<void> => {
  testThoughtIndex = { ...thoughtIndex }
}

/** Initializes the in-memory test thoughtspace with the given replica ID. */
export const init = async (replicaIdArg: Uint8Array): Promise<void> => {
  replicaId = replicaIdArg
  seedSystemThoughts()
}

/** In-memory TreeCRDT data provider for unit tests. */
const testThoughtspaceDataProvider: DataProvider<[Uint8Array]> = {
  name: 'treecrdt-test',
  init,
  clear,
  getLexemeById,
  getLexemesByIds,
  getThoughtById,
  getThoughtsByIds,
  updateThoughts,
  freeThought,
  freeLexeme,
  updateLexemeIndex,
  updateThoughtIndex,
}

export default testThoughtspaceDataProvider
