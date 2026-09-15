import type { Operation } from '@treecrdt/interface'
import type { WriteOptions } from '@treecrdt/interface/engine'
import type { TreecrdtWebSocketSyncClient } from '@treecrdt/sync'
import type { TreecrdtClient } from '@treecrdt/wa-sqlite'
import type Index from '../../@types/IndexType'
import type Thought from '../../@types/Thought'
import type ThoughtId from '../../@types/ThoughtId'
import type Timestamp from '../../@types/Timestamp'
import { EM_TOKEN, GLOBAL_ROOT_TOKEN, ROOT_PARENT_ID, SETTINGS_TOKEN, SETTINGS_VALUE } from '../../constants'
import testFlags from '../../e2e/testFlags'
import { childrenMapKey } from '../../util/createChildrenMap'
import hashThought from '../../util/hashThought'
import isAttribute from '../../util/isAttribute'
import sleep from '../../util/sleep'
import type { DataProvider } from '../DataProvider'
import type { PersistThoughtspaceBatch, ThoughtspaceMaterializationBridge } from '../thoughtspace'
import {
  deleteAttributeChild,
  ensureAttributeChildrenIndexReady,
  getAttributeChildrenByParent,
  upsertAttributeChild,
} from './attributeChildren'
import createLexemeIndex from './lexemes'
import { decodeThoughtPayload, encodeThoughtPayload } from './payload'
import { applyMaterializedThoughtsToStore } from './sync'
import type { MaterializationContext } from './sync/applyMaterializedThoughtsToStore'
import { SYSTEM_ROOT_THOUGHT_IDS } from './systemThoughtIds'
import {
  createTreecrdtLocalWriteOptions,
  isStaleThoughtWrite,
  waitForTreecrdtWriteBarrier,
  withTreecrdtWriteBarrier,
} from './writeBarrier'

type TreecrdtPlacement = { type: 'first' } | { type: 'last' } | { type: 'after'; after: ThoughtId }

type TreecrdtClientIdentity = Readonly<{
  client: TreecrdtClient
  replicaId: Uint8Array
}>

type TreecrdtClientDataProvider = Pick<
  DataProvider,
  'getLexemeById' | 'getLexemesByIds' | 'getThoughtById' | 'getThoughtsByIds' | 'updateThoughts'
>

type BoundTreecrdtDataProvider = TreecrdtClientDataProvider & {
  persistPushQueueBatches: (
    batches: readonly PersistThoughtspaceBatch[],
  ) => Promise<Awaited<ReturnType<DataProvider['updateThoughts']>>[]>
}

/** Creates the private provider-readiness state used by reads and writes that race startup. */
const createProviderReadiness = () => {
  let resolve!: (db: BoundTreecrdtDataProvider) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<BoundTreecrdtDataProvider>((resolvePromise, rejectPromise) => {
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
  // TreeCRDT retains deleted payloads; EM reads expose only live thoughts.
  if (!(await client.tree.exists(id))) return undefined
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
 * Compatibility fallback for direct provider inserts and placements whose sibling anchor disappeared.
 * Redux writes capture explicit placement before storage normalizes display ranks.
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

/** Applies thought updates and collects the old/new membership keys using the same storage reads. */
const updateThoughtsForClient = async (
  { client, replicaId }: TreecrdtClientIdentity,
  { thoughtIndexUpdates, movePlacements, writeId }: Parameters<DataProvider['updateThoughts']>[0],
): Promise<{ operations: readonly Operation[]; lexemeKeys: string[] }> => {
  const ops: Operation[] = []
  const writeOptions = createTreecrdtLocalWriteOptions(writeId)
  const lexemeKeys = new Set<string>()

  const deletes: ThoughtId[] = []

  for (const [id, patch] of Object.entries(thoughtIndexUpdates)) {
    const thoughtId = id as ThoughtId
    if (patch === null) {
      deletes.push(thoughtId)
      continue
    }
    if (patch.value !== undefined) lexemeKeys.add(hashThought(patch.value))
    const exists = await client.tree.exists(thoughtId)
    const existing = exists ? await getThoughtByIdFromClient(client, thoughtId) : undefined
    if (
      !existing &&
      (patch.value === undefined ||
        patch.parentId === undefined ||
        patch.rank === undefined ||
        patch.created === undefined ||
        patch.lastUpdated === undefined ||
        patch.updatedBy === undefined)
    ) {
      throw new Error(`Cannot apply an edit to missing thought ${thoughtId}.`)
    }
    const thought = { ...existing, ...patch, id: thoughtId } as Thought
    const payloadBytes = encodeThoughtPayload({
      value: thought.value,
      created: thought.created,
      lastUpdated: thought.lastUpdated,
      updatedBy: thought.updatedBy,
      ...(thought.archived !== undefined && { archived: thought.archived }),
    })

    const parentId = treeParentId(thought.parentId)

    if (!exists) {
      const placement = await getTreecrdtPlacement(client, thoughtId, thought, movePlacements)
      ops.push(await client.local.insert(replicaId, parentId, thoughtId, placement, payloadBytes, writeOptions))
      if (isAttribute(thought.value)) {
        await upsertAttributeChild(client, parentId, thoughtId, thought.value)
      }
    } else {
      if (!existing) continue
      lexemeKeys.add(hashThought(existing.value))

      const parentChanged = existing.parentId !== thought.parentId
      const valueChanged = existing.value !== thought.value
      const orderChanged = thoughtId in (movePlacements || {})
      if (parentChanged || orderChanged) {
        const placement = await getTreecrdtPlacement(client, thoughtId, thought, movePlacements, {
          requireExplicit: true,
        })
        ops.push(await client.local.move(replicaId, thoughtId, parentId, placement, writeOptions))
      }

      const payloadChanged =
        existing.value !== thought.value ||
        existing.created !== thought.created ||
        existing.lastUpdated !== thought.lastUpdated ||
        existing.updatedBy !== thought.updatedBy ||
        existing.archived !== thought.archived

      if (payloadChanged) {
        ops.push(await client.local.payload(replicaId, thoughtId, payloadBytes, writeOptions))
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

  // Move surviving children first: a later move can revive a defensively deleted ancestor.
  for (const id of deletes) {
    const payload = await client.tree.getPayload(id)
    if (payload) lexemeKeys.add(hashThought(decodeThoughtPayload(payload).value))
    ops.push(await client.local.delete(replicaId, id, writeOptions))
    await deleteAttributeChild(client, id)
  }

  return { operations: ops, lexemeKeys: [...lexemeKeys] }
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
    const { operations, lexemeKeys } = await updateThoughtsForClient({ client, replicaId }, updates)
    const values = await lexemes.getLexemesByIds(lexemeKeys)
    return {
      operations,
      lexemeIndex: Object.fromEntries(lexemeKeys.map((key, i) => [key, values[i] ?? null])),
    }
  },
})

/**
 * Creates the stable app-facing TreeCRDT data provider.
 *
 * The runtime supplies its client during initialization. Reads and writes wait for it; a failed initialization
 * or drop rejects those calls so a later initialization can start cleanly.
 */
const createTreecrdtDataProvider = () => {
  let activeDb: BoundTreecrdtDataProvider | null = null
  let providerReadiness = createProviderReadiness()

  /** Dispatches public writes to the client provider that becomes ready for them. */
  const updateThoughts: DataProvider['updateThoughts'] = updates =>
    activeDb ? activeDb.updateThoughts(updates) : providerReadiness.promise.then(db => db.updateThoughts(updates))

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
  ): Promise<{ syncClient: TreecrdtWebSocketSyncClient; unsubscribe: () => Promise<void> }> => {
    if (activeDb) throw new Error('TreeCRDT DataProvider: client already bound')
    await initializeThoughtspaceStorage(client, replicaId)

    const lexemes = await createLexemeIndex(client)
    const clientDb = createClientDataProvider({ client, replicaId }, lexemes)
    const materializationContext: MaterializationContext = {
      bridge: materialization,
      client,
      db: clientDb,
      pending: [],
    }
    let subscribed = true

    /** Finishes indexing and publication before another external storage call may start. */
    const run = <T>(work: () => Promise<T>): Promise<T> => {
      if (!subscribed) return Promise.reject(new Error('TreeCRDT client binding is closed.'))
      return withTreecrdtWriteBarrier(async () => {
        try {
          return await work()
        } finally {
          await applyMaterializedThoughtsToStore(materializationContext)
        }
      })
    }

    /** Persists one Redux flush and confirms it with the resulting read model, including no-ops. */
    const persistPushQueueBatches: BoundTreecrdtDataProvider['persistPushQueueBatches'] = batches =>
      run(async () => {
        const generation = materialization?.getSnapshot().generation
        const writeIds = batches.flatMap(batch => (batch.writeId ? [batch.writeId] : []))
        const results: Awaited<ReturnType<DataProvider['updateThoughts']>>[] = []
        for (const batch of batches) results.push(await clientDb.updateThoughts(batch))
        // Includes no-op confirmations, which have no materialization event of their own.
        if (
          generation === undefined ||
          writeIds.length === 0 ||
          !writeIds.every(id => isStaleThoughtWrite(id, generation))
        ) {
          await applyMaterializedThoughtsToStore(materializationContext, {
            generation,
            writeIds,
            lexemeIndex: Object.assign({}, ...results.map(result => result.lexemeIndex)),
          })
        }
        return results
      })

    const unsubscribeMaterialized = client.onMaterialized(event => {
      const keys = lexemes.applyChanges(event)
      // The outer job may still be reading/writing when indexing rejects. Publication observes the error.
      void keys.catch(() => undefined)
      materializationContext.pending.push({ event, keys, generation: materialization?.getSnapshot().generation })
      // Owned jobs flush directly. This also handles a recovery event emitted outside a write.
      if (subscribed && materializationContext.pending.length === 1) {
        void run(async () => undefined).catch(err => console.error('TreeCRDT materialization refresh failed', err))
      }
    })

    /** A recovering read can precede its derived index updates; finish those before returning a read model. */
    const read = <T>(work: () => Promise<T>): Promise<T> =>
      run(async () => {
        const result = await work()
        if (materializationContext.pending.length === 0) return result
        await applyMaterializedThoughtsToStore(materializationContext)
        return work()
      })

    activeDb = {
      getLexemeById: key => read(() => clientDb.getLexemeById(key)),
      getLexemesByIds: keys => read(() => clientDb.getLexemesByIds(keys)),
      getThoughtById: id => read(() => clientDb.getThoughtById(id)),
      getThoughtsByIds: ids => read(() => clientDb.getThoughtsByIds(ids)),
      updateThoughts: async updates => (await persistPushQueueBatches([updates]))[0],
      persistPushQueueBatches,
    }
    providerReadiness.resolve(activeDb)

    // Sync's backend and SQL entry points share the provider's storage queue.
    const syncClient: TreecrdtWebSocketSyncClient = {
      ...client,
      runner: {
        exec: sql => run(async () => client.runner.exec(sql)),
        getText: (sql, params) => run(async () => client.runner.getText(sql, params)),
      },
      meta: {
        headLamport: () => run(() => client.meta.headLamport()),
        replicaMaxCounter: replica => run(() => client.meta.replicaMaxCounter(replica)),
      },
      opRefs: {
        all: () => run(() => client.opRefs.all()),
        children: parent => run(() => client.opRefs.children(parent)),
      },
      ops: {
        append: (op, options) => run(() => client.ops.append(op, options)),
        appendMany: (ops, options?: WriteOptions) => run(() => client.ops.appendMany(ops, options)),
        all: () => run(() => client.ops.all()),
        since: (lamport, root) => run(() => client.ops.since(lamport, root)),
        children: parent => run(() => client.ops.children(parent)),
        get: refs => run(() => client.ops.get(refs)),
      },
    }
    return {
      syncClient,
      unsubscribe: async () => {
        if (!subscribed) return
        subscribed = false
        try {
          await waitForTreecrdtWriteBarrier()
          await lexemes.waitForIdle()
        } finally {
          unsubscribeMaterialized()
        }
      },
    }
  }

  return {
    db,
    bindClient,
    resetBinding,
    persistPushQueueBatches: (batches: readonly PersistThoughtspaceBatch[]) =>
      activeDb
        ? activeDb.persistPushQueueBatches(batches)
        : providerReadiness.promise.then(db => db.persistPushQueueBatches(batches)),
  }
}

export default createTreecrdtDataProvider
