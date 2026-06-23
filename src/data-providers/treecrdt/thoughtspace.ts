import type { Operation } from '@treecrdt/interface'
import type Index from '../../@types/IndexType'
import type Lexeme from '../../@types/Lexeme'
import type Thought from '../../@types/Thought'
import type ThoughtId from '../../@types/ThoughtId'
import type Timestamp from '../../@types/Timestamp'
import { EM_TOKEN, GLOBAL_ROOT_TOKEN, ROOT_PARENT_ID, SETTINGS_TOKEN, SETTINGS_VALUE } from '../../constants'
import { childrenMapKey } from '../../util/createChildrenMap'
import hashThought from '../../util/hashThought'
import type { DataProvider } from '../DataProvider'
import {
  deleteAllLexemes,
  deleteLexeme as deleteLexemeRow,
  ensureLexemesSchema,
  getLexemeById as getLexemeByIdSql,
  getLexemesByIds as getLexemesByIdsSql,
  upsertLexeme,
} from './lexemes'
import { decodeThoughtPayload, encodeThoughtPayload } from './payload'
import {
  enqueueMaterializedThoughtsToStore,
  tryStartTreecrdtWebSocketSyncFromEnv as tryStartTreecrdtWebSocketSync,
} from './sync'
import { SYSTEM_ROOT_THOUGHT_IDS } from './systemThoughtIds'
import { dropTreecrdt, getTreecrdtClient, registerBeforeTreecrdtClose } from './treecrdt'
import { createTreecrdtLocalWriteOptions, isTreecrdtLocalMaterialization } from './writeBarrier'

type TreecrdtPlacement = { type: 'first' } | { type: 'last' } | { type: 'after'; after: ThoughtId }

let replicaId: Uint8Array | null = null
let initialized = false
let initReadyResolve: (() => void) | null = null
let initReady = new Promise<void>(resolve => {
  initReadyResolve = resolve
})

/** Creates em's childrenMap key while preserving TreeCRDT's strict child ids as values. */
const materializedChildrenMapKey = async (childrenMap: Index<ThoughtId>, childId: ThoughtId): Promise<string> => {
  const client = getTreecrdtClient()
  const payloadBytes = await client.tree.getPayload(childId)
  if (!payloadBytes) return childId

  const { value } = decodeThoughtPayload(payloadBytes)
  return childrenMapKey(childrenMap, { id: childId, value })
}

/** Resets the provider readiness barrier used by writes that race startup. */
const resetInitReady = (): void => {
  initialized = false
  initReady = new Promise<void>(resolve => {
    initReadyResolve = resolve
  })
}

/** Marks provider init complete so queued writes can safely use the TreeCRDT client. */
const resolveInitReady = (): void => {
  initialized = true
  initReadyResolve?.()
  initReadyResolve = null
}

/** Waits for `init` to finish before writes touch the TreeCRDT client. */
const waitForInitReady = async (): Promise<Uint8Array> => {
  if (!initialized) {
    await initReady
  }
  if (!replicaId) throw new Error('TreeCRDT DataProvider: init not called')
  return replicaId
}

/** Session replica identity (passed to `init`); minted ops use this for correct CRDT attribution. */
export function getThoughtspaceReplicaId(): Uint8Array {
  if (!replicaId) throw new Error('TreeCRDT DataProvider: init not called')
  return replicaId
}

/** Fetches a thought by ID from the tree. */
const getThoughtById = async (id: ThoughtId): Promise<Thought | undefined> => {
  const client = getTreecrdtClient()

  const payloadBytes = await client.tree.getPayload(id)
  if (payloadBytes === null) return undefined

  const payload = decodeThoughtPayload(payloadBytes)

  const parentIdRaw = await client.tree.parent(id)
  const parentId: ThoughtId = parentIdRaw === null ? (ROOT_PARENT_ID as ThoughtId) : (parentIdRaw as ThoughtId)
  const siblingIds = parentIdRaw === null ? [] : await client.tree.children(parentIdRaw)
  const rank = parentIdRaw === null ? 0 : Math.max(0, siblingIds.indexOf(id))

  const childIds = await client.tree.children(id)
  const childrenMap: Index<ThoughtId> = {}
  for (const cid of childIds) {
    const childId = cid as ThoughtId
    childrenMap[await materializedChildrenMapKey(childrenMap, childId)] = childId
  }

  const thought: Thought = {
    id,
    value: payload.value,
    rank,
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
 * TODO: Remove when create/import/newThought paths pass explicit placement and selectors read provider-backed order.
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
  const activeReplicaId = await waitForInitReady()
  const client = getTreecrdtClient()
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

/** No-op for freeing a lexeme; TreeCRDT does not keep a per-lexeme provider cache. */
const freeLexeme = async (_key: string): Promise<void> => {
  // no-op
}

/** Clears all thoughts by dropping storage and closing the client. */
const clear = async (): Promise<void> => {
  await dropTreecrdt()
  replicaId = null
  resetInitReady()
}

/** Loads a lexeme by hash key from database. */
const getLexemeById = async (key: string): Promise<Lexeme | undefined> => {
  const client = getTreecrdtClient()
  return getLexemeByIdSql(client, key)
}

/** Loads lexemes for hash keys in parallel order. */
const getLexemesByIds = async (keys: string[]): Promise<(Lexeme | undefined)[]> => {
  const client = getTreecrdtClient()
  return getLexemesByIdsSql(client, keys)
}

/** Replaces all stored lexemes. Required by DataProvider conformance tests. */
const updateLexemeIndex = async (lexemeIndex: Index<Lexeme>): Promise<void> => {
  const client = getTreecrdtClient()
  await deleteAllLexemes(client)
  for (const [id, lexeme] of Object.entries(lexemeIndex)) {
    await upsertLexeme(client, id, lexeme)
  }
}

const ROOT_PAYLOAD = encodeThoughtPayload({
  value: GLOBAL_ROOT_TOKEN,
  created: 0,
  lastUpdated: 0,
  updatedBy: '',
})

/** Initializes the thoughtspace with the given replica ID. */
export const init = async (replicaIdArg: Uint8Array): Promise<void> => {
  replicaId = replicaIdArg

  const client = getTreecrdtClient()
  await ensureLexemesSchema(client)
  // Ensure root has payload so getThoughtById can use the generic path
  await client.local.payload(replicaIdArg, GLOBAL_ROOT_TOKEN, ROOT_PAYLOAD, createTreecrdtLocalWriteOptions())
  for (const id of SYSTEM_ROOT_THOUGHT_IDS) {
    if (!(await client.tree.exists(id))) {
      const now = Date.now()
      await client.local.insert(
        replicaId,
        GLOBAL_ROOT_TOKEN,
        id,
        { type: 'last' },
        encodeThoughtPayload({
          value: id,
          created: now,
          lastUpdated: now,
          updatedBy: '',
        }),
        createTreecrdtLocalWriteOptions(),
      )
    }
  }

  let settingsId: ThoughtId | null = null
  for (const childId of await client.tree.children(EM_TOKEN)) {
    const payloadBytes = await client.tree.getPayload(childId)
    if (!payloadBytes) continue
    const payload = decodeThoughtPayload(payloadBytes)
    if (payload.value === SETTINGS_VALUE) {
      settingsId = childId as ThoughtId
      break
    }
  }

  if (
    !settingsId &&
    (await client.tree.exists(SETTINGS_TOKEN)) &&
    (await client.tree.parent(SETTINGS_TOKEN)) === EM_TOKEN
  ) {
    settingsId = SETTINGS_TOKEN
  }

  if (!settingsId) {
    const now = Date.now()
    await client.local.insert(
      replicaId,
      EM_TOKEN,
      SETTINGS_TOKEN,
      { type: 'last' },
      encodeThoughtPayload({
        value: SETTINGS_VALUE,
        created: now,
        lastUpdated: now,
        updatedBy: '',
      }),
      createTreecrdtLocalWriteOptions(),
    )
    settingsId = SETTINGS_TOKEN
  }

  if (settingsId) {
    const now = Date.now()
    await upsertLexeme(client, hashThought(SETTINGS_VALUE), {
      contexts: [settingsId],
      created: now as Timestamp,
      lastUpdated: now as Timestamp,
      updatedBy: '',
    })
  }

  resolveInitReady()

  const unsubscribeMaterialized = client.onMaterialized(event => {
    // Local TreeCRDT writes are already reflected optimistically in Redux. Peer-tab and server-sync writes arrive
    // without this tab's write id, so those materialization events must be read back into Redux.
    if (isTreecrdtLocalMaterialization(event)) return

    void enqueueMaterializedThoughtsToStore(event).catch(err =>
      console.error('TreeCRDT materialized UI sync failed', err),
    )
  })
  registerBeforeTreecrdtClose(async () => {
    unsubscribeMaterialized()
  })

  await tryStartTreecrdtWebSocketSync(client)
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
