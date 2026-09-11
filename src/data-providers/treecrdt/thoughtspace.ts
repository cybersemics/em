import type { Operation } from '@treecrdt/interface'
import type { TreecrdtClient } from '@treecrdt/wa-sqlite'
import type Index from '../../@types/IndexType'
import type Thought from '../../@types/Thought'
import type ThoughtId from '../../@types/ThoughtId'
import type Timestamp from '../../@types/Timestamp'
import { EM_TOKEN, GLOBAL_ROOT_TOKEN, ROOT_PARENT_ID, SETTINGS_TOKEN, SETTINGS_VALUE } from '../../constants'
import testFlags from '../../e2e/testFlags'
import { childrenMapKey } from '../../util/createChildrenMap'
import isAttribute from '../../util/isAttribute'
import sleep from '../../util/sleep'
import type { DataProvider } from '../DataProvider'
import type { ThoughtspaceMaterializationBridge } from '../thoughtspace'
import {
  deleteAttributeChild,
  ensureAttributeChildrenIndexReady,
  getAttributeChildrenByParent,
  upsertAttributeChild,
} from './attributeChildren'
import createLexemeIndex from './lexemes'
import { decodeThoughtPayload, encodeThoughtPayload } from './payload'
import { enqueueMaterializedThoughtsToStore } from './sync'
import { SYSTEM_ROOT_THOUGHT_IDS } from './systemThoughtIds'
import { createTreecrdtLocalWriteOptions } from './writeBarrier'

type TreecrdtPlacement = { type: 'first' } | { type: 'last' } | { type: 'after'; after: ThoughtId }

type TreecrdtClientIdentity = Readonly<{
  client: TreecrdtClient
  replicaId: Uint8Array
}>

type TreecrdtClientDataProvider = Pick<
  DataProvider,
  'getLexemeById' | 'getLexemesByIds' | 'getThoughtById' | 'getThoughtsByIds' | 'updateThoughts'
>

/** Creates the private provider-readiness state used by reads and writes that race startup. */
const createProviderReadiness = () => {
  let resolve!: (db: TreecrdtClientDataProvider) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<TreecrdtClientDataProvider>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })

  // Public calls observe this rejection; this catch prevents an unhandled rejection when no call was waiting.
  void promise.catch(() => undefined)

  return { promise, reject, resolve }
}

/** Creates em's childrenMap read-model index while preserving TreeCRDT's strict child ids as values. */
export const createIndexedChildrenMap = (
  childIds: ThoughtId[],
  attributeValueByChildId: Index<string>,
): Index<ThoughtId> => {
  const childrenMap: Index<ThoughtId> = {}
  for (const childId of childIds) {
    const value = attributeValueByChildId[childId]
    childrenMap[value ? childrenMapKey(childrenMap, { id: childId, value }) : childId] = childId
  }
  return childrenMap
}

/** Injects delayed TreeCRDT reads for e2e tests that exercise slow local materialization after refresh. */
const waitForTestReplicationDelay = async (): Promise<void> => {
  if (testFlags.replicationDelay > 0) {
    await sleep(testFlags.replicationDelay)
  }
}

/** Fetches a thought by ID from the given TreeCRDT client. */
const getThoughtByIdFromClient = async (client: TreecrdtClient, id: ThoughtId): Promise<Thought | undefined> => {
  const payloadBytes = await client.tree.getPayload(id)
  if (payloadBytes === null) return undefined

  const payload = decodeThoughtPayload(payloadBytes)

  const parentIdRaw = await client.tree.parent(id)
  const parentId: ThoughtId = parentIdRaw === null ? (ROOT_PARENT_ID as ThoughtId) : (parentIdRaw as ThoughtId)
  const siblingIds = parentIdRaw === null ? [] : await client.tree.children(parentIdRaw)
  const rank = parentIdRaw === null ? 0 : Math.max(0, siblingIds.indexOf(id))

  const childIds = (await client.tree.children(id)) as ThoughtId[]
  const childrenMap = createIndexedChildrenMap(childIds, await getAttributeChildrenByParent(client, id))

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

/** Converts em's root parent id to TreeCRDT's global root id. */
const treeParentId = (id: ThoughtId): ThoughtId => (id === ROOT_PARENT_ID ? GLOBAL_ROOT_TOKEN : id)

/**
 * Derives TreeCRDT relative placement from em's numeric rank payload.
 * This is the compatibility bridge while the app still treats rank as canonical display order.
 * TODO: Remove when create/import/newThought paths pass explicit placement and selectors read provider-backed order.
 */
const getRankPlacement = async (
  client: TreecrdtClient,
  parentId: ThoughtId,
  thoughtId: ThoughtId,
  rank: number,
): Promise<TreecrdtPlacement> => {
  const childIds = await client.tree.children(parentId)
  const afterId = childIds.reduce<ThoughtId | undefined>(
    (previousId, childId, index) => (childId !== thoughtId && index < rank ? (childId as ThoughtId) : previousId),
    undefined,
  )

  return afterId ? { type: 'after', after: afterId } : { type: 'first' }
}

/** Resolves caller-provided TreeCRDT placement, falling back to rank when old callers or stale siblings omit it. */
const getTreecrdtPlacement = async (
  client: TreecrdtClient,
  thoughtId: ThoughtId,
  thought: Thought,
  movePlacements?: Index<ThoughtId | null>,
  options?: { requireExplicit?: boolean },
): Promise<TreecrdtPlacement> => {
  const parentId = treeParentId(thought.parentId)

  if (!movePlacements || !Object.prototype.hasOwnProperty.call(movePlacements, thoughtId)) {
    if (options?.requireExplicit) {
      throw new Error(`TreeCRDT move for ${thoughtId} requires explicit placement.`)
    }
    return getRankPlacement(client, parentId, thoughtId, thought.rank)
  }

  const afterId = movePlacements[thoughtId]
  if (afterId == null) return { type: 'first' }
  if (afterId === thoughtId) throw new Error(`TreeCRDT move for ${thoughtId} cannot be placed after itself.`)

  const childIds = await client.tree.children(parentId)
  if (!childIds.includes(afterId)) {
    return getRankPlacement(client, parentId, thoughtId, thought.rank)
  }

  return { type: 'after', after: afterId }
}

/** Applies thought index updates and move placements to one exact TreeCRDT client. */
const updateThoughtsForClient = async (
  { client, replicaId }: TreecrdtClientIdentity,
  { thoughtIndexUpdates, movePlacements }: Parameters<DataProvider['updateThoughts']>[0],
): Promise<readonly Operation[]> => {
  const ops: Operation[] = []

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
    ops.push(await client.local.delete(replicaId, id, createTreecrdtLocalWriteOptions()))
    await deleteAttributeChild(client, id)
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
      const placement = await getTreecrdtPlacement(client, thoughtId, thought, movePlacements)
      ops.push(
        await client.local.insert(
          replicaId,
          parentId,
          thoughtId,
          placement,
          payloadBytes,
          createTreecrdtLocalWriteOptions(),
        ),
      )
      if (isAttribute(thought.value)) {
        await upsertAttributeChild(client, parentId, thoughtId, thought.value)
      }
    } else {
      const existing = await getThoughtByIdFromClient(client, thoughtId)
      if (!existing) continue

      const parentChanged = existing.parentId !== thought.parentId
      const valueChanged = existing.value !== thought.value
      const orderChanged = thoughtId in (movePlacements || {})
      if (parentChanged || orderChanged) {
        const placement = await getTreecrdtPlacement(client, thoughtId, thought, movePlacements, {
          requireExplicit: true,
        })
        ops.push(await client.local.move(replicaId, thoughtId, parentId, placement, createTreecrdtLocalWriteOptions()))
      }

      const payloadChanged =
        existing.value !== thought.value ||
        existing.created !== thought.created ||
        existing.lastUpdated !== thought.lastUpdated ||
        existing.updatedBy !== thought.updatedBy ||
        existing.archived !== thought.archived

      if (payloadChanged) {
        ops.push(await client.local.payload(replicaId, thoughtId, payloadBytes, createTreecrdtLocalWriteOptions()))
      }

      if (parentChanged || valueChanged) {
        if (isAttribute(thought.value)) {
          await upsertAttributeChild(client, parentId, thoughtId, thought.value)
        } else if (isAttribute(existing.value)) {
          await deleteAttributeChild(client, thoughtId)
        }
      }
    }
  }

  return ops
}

const ROOT_PAYLOAD = encodeThoughtPayload({
  value: GLOBAL_ROOT_TOKEN,
  created: 0,
  lastUpdated: 0,
  updatedBy: '',
})

/** Seeds TreeCRDT storage for an em thoughtspace. */
const initializeThoughtspaceStorage = async (client: TreecrdtClient, replicaId: Uint8Array): Promise<void> => {
  // Ensure root has payload so getThoughtById can use the generic path.
  if ((await client.tree.getPayload(GLOBAL_ROOT_TOKEN)) === null) {
    await client.local.payload(replicaId, GLOBAL_ROOT_TOKEN, ROOT_PAYLOAD, createTreecrdtLocalWriteOptions())
  }
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
  }

  await ensureAttributeChildrenIndexReady(client)
}

/** Creates a data provider whose operations are permanently bound to one TreeCRDT client. */
const createClientDataProvider = (
  { client, replicaId }: TreecrdtClientIdentity,
  lexemes: Awaited<ReturnType<typeof createLexemeIndex>>,
): TreecrdtClientDataProvider => ({
  getLexemeById: lexemes.getLexemeById,
  getLexemesByIds: lexemes.getLexemesByIds,
  getThoughtById: id => getThoughtByIdFromClient(client, id),
  getThoughtsByIds: async ids => {
    await waitForTestReplicationDelay()
    return Promise.all(ids.map(id => getThoughtByIdFromClient(client, id)))
  },
  updateThoughts: async updates => {
    const ops = await updateThoughtsForClient({ client, replicaId }, updates)
    await lexemes.waitForIdle()
    return ops
  },
})

/**
 * Creates the stable app-facing TreeCRDT data provider.
 *
 * The runtime supplies its client during initialization. Reads and writes wait for it; a failed initialization
 * or drop rejects those calls so a later initialization can start cleanly.
 */
const createTreecrdtDataProvider = () => {
  let activeDb: TreecrdtClientDataProvider | null = null
  let providerReadiness = createProviderReadiness()

  /** Dispatches public writes to the client provider that becomes ready for them. */
  const updateThoughts: DataProvider['updateThoughts'] = async updates =>
    (await providerReadiness.promise).updateThoughts(updates)

  /** Clears the current client provider, rejects startup writes, and creates fresh readiness state. */
  const resetBinding = (reason: unknown): void => {
    providerReadiness.reject(reason)
    activeDb = null
    providerReadiness = createProviderReadiness()
  }

  const db = {
    name: 'treecrdt',
    getLexemeById: async key => (await providerReadiness.promise).getLexemeById(key),
    getLexemesByIds: async keys => (await providerReadiness.promise).getLexemesByIds(keys),
    getThoughtById: async id => (await providerReadiness.promise).getThoughtById(id),
    getThoughtsByIds: async ids => (await providerReadiness.promise).getThoughtsByIds(ids),
    updateThoughts,
    // Freeing cache entries remains a no-op before initialization.
    freeThought: async _id => undefined,
    freeLexeme: async _key => undefined,
  } satisfies Omit<DataProvider, 'clear'>

  /** Seeds the supplied client, creates its provider, and then releases queued startup calls. */
  const bindClient = async (
    client: TreecrdtClient,
    replicaId: Uint8Array,
    materialization?: ThoughtspaceMaterializationBridge,
  ): Promise<() => Promise<void>> => {
    if (activeDb) throw new Error('TreeCRDT DataProvider: client already bound')
    await initializeThoughtspaceStorage(client, replicaId)

    const lexemes = await createLexemeIndex(client)
    const clientDb = createClientDataProvider({ client, replicaId }, lexemes)
    const materializationContext = { bridge: materialization, client, db: clientDb }

    const unsubscribeMaterialized = client.onMaterialized(event => {
      const keys = lexemes.applyChanges(event)
      void enqueueMaterializedThoughtsToStore(event, materializationContext, keys).catch(err =>
        console.error('TreeCRDT materialization refresh failed', err),
      )
    })

    activeDb = clientDb
    providerReadiness.resolve(clientDb)
    let subscribed = true
    return async () => {
      if (!subscribed) return
      subscribed = false
      unsubscribeMaterialized()
      await lexemes.waitForIdle()
    }
  }

  return {
    db,
    bindClient,
    resetBinding,
  }
}

export default createTreecrdtDataProvider
