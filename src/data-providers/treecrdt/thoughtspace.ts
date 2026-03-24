import type Index from '../../@types/IndexType'
import type Lexeme from '../../@types/Lexeme'
import type Thought from '../../@types/Thought'
import type ThoughtId from '../../@types/ThoughtId'
import type Timestamp from '../../@types/Timestamp'
import { ABSOLUTE_TOKEN, EM_TOKEN, GLOBAL_ROOT_TOKEN, HOME_TOKEN, ROOT_PARENT_ID } from '../../constants'
import type { DataProvider } from '../DataProvider'
import { dropTreecrdt, getTreecrdtClient } from './treecrdt'

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

/** Encodes a thought payload to bytes. */
export function encodeThoughtPayload(payload: ThoughtPayload): Uint8Array {
  return encoder.encode(JSON.stringify(payload))
}

/** Decodes bytes to a thought payload. */
export function decodeThoughtPayload(bytes: Uint8Array): ThoughtPayload {
  return JSON.parse(decoder.decode(bytes)) as ThoughtPayload
}

let replicaId: Uint8Array | null = null

/** Fetches a thought by ID from the tree. */
const getThoughtById = async (id: ThoughtId): Promise<Thought | undefined> => {
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

/** Applies thought index updates and move placements to the tree. */
const updateThoughts = async ({
  thoughtIndexUpdates,
  movePlacements,
}: {
  thoughtIndexUpdates: Index<Thought | null>
  lexemeIndexUpdates: Index<Lexeme | null>
  lexemeIndexUpdatesOld: Index<Lexeme | undefined>
  schemaVersion: number
  movePlacements?: Index<ThoughtId | undefined>
}): Promise<void> => {
  if (!replicaId) throw new Error('TreeCRDT DataProvider: init not called')

  const client = getTreecrdtClient()

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
    await client.local.delete(replicaId, id)
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

    const placement =
      thoughtId in (movePlacements || {})
        ? movePlacements![thoughtId] != null
          ? { type: 'after' as const, after: movePlacements![thoughtId]! }
          : { type: 'first' as const }
        : { type: 'last' as const }

    if (!exists) {
      await client.local.insert(
        replicaId,
        thought.parentId === ROOT_PARENT_ID ? GLOBAL_ROOT_TOKEN : thought.parentId,
        thoughtId,
        placement,
        payloadBytes,
      )
    } else {
      const existing = await getThoughtById(thoughtId)
      if (!existing) continue

      const parentChanged = existing.parentId !== thought.parentId
      const orderChanged = thoughtId in (movePlacements || {})
      if (parentChanged || orderChanged) {
        await client.local.move(
          replicaId,
          thoughtId,
          thought.parentId === ROOT_PARENT_ID ? GLOBAL_ROOT_TOKEN : thought.parentId,
          placement,
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
        await client.local.payload(replicaId, thoughtId, payloadBytes)
      }
    }
  }
}

/** No-op for freeing a thought. */
const freeThought = async (_id: ThoughtId): Promise<void> => {
  // no-op
}

/** No-op for freeing a lexeme. */
const freeLexeme = async (_key: string): Promise<void> => {
  // no-op
}

/** Clears all thoughts by dropping storage and closing the client. */
const clear = async (): Promise<void> => {
  if (!replicaId) throw new Error('TreeCRDT DataProvider: init not called')

  await dropTreecrdt()
  replicaId = null
}

/** Returns undefined as lexemes are not stored in treecrdt. */
const getLexemeById = async (_key: string): Promise<Lexeme | undefined> => undefined

/** Returns undefined for each key as lexemes are not stored in treecrdt. */
const getLexemesByIds = async (keys: string[]): Promise<(Lexeme | undefined)[]> =>
  Promise.resolve(keys.map(() => undefined))

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
  const client = getTreecrdtClient()
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
}

export default thoughtspaceDataProvider
