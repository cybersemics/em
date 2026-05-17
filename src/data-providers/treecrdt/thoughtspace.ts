import type { Operation } from '@treecrdt/interface'
import type Index from '../../@types/IndexType'
import type Lexeme from '../../@types/Lexeme'
import type Thought from '../../@types/Thought'
import type ThoughtId from '../../@types/ThoughtId'
import type Timestamp from '../../@types/Timestamp'
import { ABSOLUTE_TOKEN, EM_TOKEN, GLOBAL_ROOT_TOKEN, HOME_TOKEN, ROOT_PARENT_ID } from '../../constants'
import type { DataProvider } from '../DataProvider'
import {
  deleteAllLexemes,
  deleteLexeme as deleteLexemeRow,
  ensureLexemesSchema,
  getLexemeById as getLexemeByIdSql,
  getLexemesByIds as getLexemesByIdsSql,
  upsertLexeme,
} from './lexemes'
import { dropTreecrdt, getTreecrdtClient } from './treecrdt'
import { createTreecrdtLocalWriteOptions } from './writeBarrier'

export type ThoughtPayload = {
  value: string
  rank: number
  created: number
  lastUpdated: number
  updatedBy: string
  archived?: number
}

const encoder = new TextEncoder()
const decoder = new TextDecoder()

type TreecrdtPlacement = { type: 'first' } | { type: 'last' } | { type: 'after'; after: ThoughtId }

/** Encodes a thought payload to bytes. */
export function encodeThoughtPayload(payload: ThoughtPayload): Uint8Array {
  return encoder.encode(JSON.stringify(payload))
}

/** Decodes bytes to a thought payload. */
export function decodeThoughtPayload(bytes: Uint8Array): ThoughtPayload {
  return JSON.parse(decoder.decode(bytes)) as ThoughtPayload
}

let replicaId: Uint8Array | null = null
// Unit tests still exercise em's DataProvider contract without loading wa-sqlite/OPFS assets.
// Keep this in-memory path test-only; browser/runtime coverage uses the real TreeCRDT client.
let testThoughtIndex: Index<Thought> = {}
let testLexemeIndex: Index<Lexeme> = {}

/** Checks if the current runtime is Vitest. */
const isTestMode = (): boolean => import.meta.env.MODE === 'test'

/** Ensures the fixed root thoughts exist in the test provider. */
const ensureTestRootThoughts = (): void => {
  for (const id of [HOME_TOKEN, EM_TOKEN, ABSOLUTE_TOKEN]) {
    if (testThoughtIndex[id]) continue
    testThoughtIndex[id] = {
      id,
      value: id,
      rank: 0,
      created: 0 as Timestamp,
      lastUpdated: 0 as Timestamp,
      updatedBy: '',
      parentId: ROOT_PARENT_ID,
      childrenMap: {},
    }
  }
}

/** Resets the in-memory TreeCRDT provider used by unit tests. */
export const resetTestThoughtspace = (): void => {
  if (!isTestMode()) return
  testThoughtIndex = {}
  testLexemeIndex = {}
  replicaId = null
}

/** Session replica identity (passed to `init`); minted ops use this for correct CRDT attribution. */
export function getThoughtspaceReplicaId(): Uint8Array {
  if (!replicaId) throw new Error('TreeCRDT DataProvider: init not called')
  return replicaId
}

/** Fetches a thought by ID from the tree. */
const getThoughtById = async (id: ThoughtId): Promise<Thought | undefined> => {
  if (isTestMode()) return testThoughtIndex[id]

  const client = getTreecrdtClient()

  const payloadBytes = await client.tree.getPayload(id)
  if (payloadBytes === null) return undefined

  const payload = decodeThoughtPayload(payloadBytes)

  const parentIdRaw = await client.tree.parent(id)
  const parentId: ThoughtId = parentIdRaw === null ? (ROOT_PARENT_ID as ThoughtId) : (parentIdRaw as ThoughtId)

  const childIds = await client.tree.children(id)
  const childrenMap: Index<ThoughtId> = {}
  for (const cid of childIds) {
    childrenMap[cid] = cid as ThoughtId
  }

  const thought: Thought = {
    id,
    value: payload.value,
    rank: payload.rank,
    created: payload.created as Timestamp,
    lastUpdated: payload.lastUpdated as Timestamp,
    updatedBy: payload.updatedBy,
    parentId,
    childrenMap,
    ...(payload.archived !== undefined && { archived: payload.archived as Timestamp }),
  }

  return thought
}

/** Fetches multiple thoughts by IDs. */
const getThoughtsByIds = (ids: ThoughtId[]): Promise<(Thought | undefined)[]> => Promise.all(ids.map(getThoughtById))

/** Converts em's root parent id to TreeCRDT's global root id. */
const treeParentId = (id: ThoughtId): ThoughtId => (id === ROOT_PARENT_ID ? GLOBAL_ROOT_TOKEN : id)

/**
 * Derives TreeCRDT relative placement from em's numeric rank payload.
 * This is the compatibility bridge while the app still treats rank as canonical display order.
 */
const getRankPlacement = async (
  parentId: ThoughtId,
  thoughtId: ThoughtId,
  rank: number,
): Promise<TreecrdtPlacement> => {
  const client = getTreecrdtClient()
  const childIds = await client.tree.children(parentId)
  let after: Thought | undefined

  for (const childId of childIds) {
    if (childId === thoughtId) continue
    const child = await getThoughtById(childId as ThoughtId)
    if (child && child.rank < rank && (!after || child.rank > after.rank)) {
      after = child
    }
  }

  return after ? { type: 'after', after: after.id } : { type: 'first' }
}

/** Resolves caller-provided TreeCRDT placement, falling back to rank when old callers or stale siblings omit it. */
const getTreecrdtPlacement = async (
  thoughtId: ThoughtId,
  thought: Thought,
  movePlacements?: Index<ThoughtId | null>,
  options?: { requireExplicit?: boolean },
): Promise<TreecrdtPlacement> => {
  const client = getTreecrdtClient()
  const parentId = treeParentId(thought.parentId)

  if (!movePlacements || !Object.prototype.hasOwnProperty.call(movePlacements, thoughtId)) {
    if (options?.requireExplicit) {
      throw new Error(`TreeCRDT move for ${thoughtId} requires explicit placement.`)
    }
    return getRankPlacement(parentId, thoughtId, thought.rank)
  }

  const afterId = movePlacements[thoughtId]
  if (afterId == null) return { type: 'first' }
  if (afterId === thoughtId) throw new Error(`TreeCRDT move for ${thoughtId} cannot be placed after itself.`)

  const childIds = await client.tree.children(parentId)
  if (!childIds.includes(afterId)) {
    throw new Error(`TreeCRDT move for ${thoughtId} references missing sibling ${afterId}.`)
  }

  return { type: 'after', after: afterId }
}

/** Applies thought index updates and move placements to the tree. */
const updateThoughts = async ({
  thoughtIndexUpdates,
  lexemeIndexUpdates,
  movePlacements,
}: {
  thoughtIndexUpdates: Index<Thought | null>
  lexemeIndexUpdates: Index<Lexeme | null>
  lexemeIndexUpdatesOld: Index<Lexeme | undefined>
  schemaVersion: number
  movePlacements?: Index<ThoughtId | null>
}): Promise<readonly Operation[]> => {
  if (!replicaId) {
    if (isTestMode()) return []
    throw new Error('TreeCRDT DataProvider: init not called')
  }

  if (isTestMode()) {
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

  const client = getTreecrdtClient()
  const activeReplicaId = replicaId
  const ops: Operation[] = []

  for (const [id, lexeme] of Object.entries(lexemeIndexUpdates)) {
    if (lexeme === null) {
      await deleteLexemeRow(client, id)
    } else {
      await upsertLexeme(client, id, lexeme)
    }
  }

  const updates: Index<Thought> = {}
  const deletes: ThoughtId[] = []

  for (const [id, thought] of Object.entries(thoughtIndexUpdates)) {
    const thoughtId = id as ThoughtId
    if (thought === null) {
      deletes.push(thoughtId)
    } else {
      updates[thoughtId] = thought
    }
  }

  for (const id of deletes) {
    ops.push(await client.local.delete(activeReplicaId, id, createTreecrdtLocalWriteOptions()))
  }

  for (const [id, thought] of Object.entries(updates)) {
    const thoughtId = id as ThoughtId
    const payloadBytes = encodeThoughtPayload({
      value: thought.value,
      rank: thought.rank,
      created: thought.created,
      lastUpdated: thought.lastUpdated,
      updatedBy: thought.updatedBy,
      ...(thought.archived !== undefined && { archived: thought.archived }),
    })

    const exists = await client.tree.exists(thoughtId)
    const parentId = treeParentId(thought.parentId)

    if (!exists) {
      const placement = await getTreecrdtPlacement(thoughtId, thought, movePlacements)
      ops.push(
        await client.local.insert(
          activeReplicaId,
          parentId,
          thoughtId,
          placement,
          payloadBytes,
          createTreecrdtLocalWriteOptions(),
        ),
      )
    } else {
      const existing = await getThoughtById(thoughtId)
      if (!existing) continue

      const parentChanged = existing.parentId !== thought.parentId
      const orderChanged = thoughtId in (movePlacements || {})
      if (parentChanged || orderChanged) {
        const placement = await getTreecrdtPlacement(thoughtId, thought, movePlacements, { requireExplicit: true })
        ops.push(
          await client.local.move(activeReplicaId, thoughtId, parentId, placement, createTreecrdtLocalWriteOptions()),
        )
      }

      const payloadChanged =
        existing.value !== thought.value ||
        existing.rank !== thought.rank ||
        existing.created !== thought.created ||
        existing.lastUpdated !== thought.lastUpdated ||
        existing.updatedBy !== thought.updatedBy ||
        existing.archived !== thought.archived

      if (payloadChanged) {
        ops.push(
          await client.local.payload(activeReplicaId, thoughtId, payloadBytes, createTreecrdtLocalWriteOptions()),
        )
      }
    }
  }

  return ops
}

/** No-op for freeing a thought. */
const freeThought = async (_id: ThoughtId): Promise<void> => {
  // no-op
}

/** Removes a lexeme row from SQLite. */
const freeLexeme = async (key: string): Promise<void> => {
  if (isTestMode()) {
    delete testLexemeIndex[key]
    return
  }

  const client = getTreecrdtClient()
  await deleteLexemeRow(client, key)
}

/** Clears all thoughts by dropping storage and closing the client. */
const clear = async (): Promise<void> => {
  if (!replicaId) {
    if (isTestMode()) {
      resetTestThoughtspace()
      return
    }
    throw new Error('TreeCRDT DataProvider: init not called')
  }

  if (isTestMode()) {
    resetTestThoughtspace()
    return
  }

  await dropTreecrdt()
  replicaId = null
}

/** Loads a lexeme by hash key from database. */
const getLexemeById = async (key: string): Promise<Lexeme | undefined> => {
  if (isTestMode()) return testLexemeIndex[key]

  const client = getTreecrdtClient()
  return getLexemeByIdSql(client, key)
}

/** Loads lexemes for hash keys in parallel order. */
const getLexemesByIds = async (keys: string[]): Promise<(Lexeme | undefined)[]> => {
  if (isTestMode()) return keys.map(key => testLexemeIndex[key])

  const client = getTreecrdtClient()
  return getLexemesByIdsSql(client, keys)
}

/** Replaces all stored lexemes with the given index (tests / provider hook). */
const updateLexemeIndex = async (lexemeIndex: Index<Lexeme>): Promise<void> => {
  if (isTestMode()) {
    testLexemeIndex = { ...lexemeIndex }
    return
  }

  const client = getTreecrdtClient()
  await deleteAllLexemes(client)
  for (const [id, lexeme] of Object.entries(lexemeIndex)) {
    await upsertLexeme(client, id, lexeme)
  }
}

const ROOT_PAYLOAD = encodeThoughtPayload({
  value: GLOBAL_ROOT_TOKEN,
  rank: 0,
  created: 0,
  lastUpdated: 0,
  updatedBy: '',
})

/** Initializes the thoughtspace with the given replica ID. */
export const init = async (replicaIdArg: Uint8Array): Promise<void> => {
  replicaId = replicaIdArg
  if (isTestMode()) {
    ensureTestRootThoughts()
    return
  }

  const client = getTreecrdtClient()
  await ensureLexemesSchema(client)
  // Ensure root has payload so getThoughtById can use the generic path
  await client.local.payload(replicaIdArg, GLOBAL_ROOT_TOKEN, ROOT_PAYLOAD)
  for (const id of [HOME_TOKEN, EM_TOKEN, ABSOLUTE_TOKEN]) {
    if (!(await client.tree.exists(id))) {
      await client.local.insert(
        replicaId,
        GLOBAL_ROOT_TOKEN,
        id,
        { type: 'last' },
        encodeThoughtPayload({
          value: id,
          rank: 0,
          created: Date.now(),
          lastUpdated: Date.now(),
          updatedBy: '',
        }),
      )
    }
  }
}

/** TreeCRDT data provider for thoughtspace. */
const thoughtspaceDataProvider: DataProvider<[Uint8Array]> = {
  name: 'treecrdt',
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
}

export default thoughtspaceDataProvider
