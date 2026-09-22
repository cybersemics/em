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
import sleep from '../../util/sleep'
import type { DataProvider } from '../DataProvider'
import type { PersistThoughtspaceBatch, ThoughtspaceMaterializationBridge } from '../thoughtspace'
import {
  getAttributeChildrenByParent,
  rebuildAttributeChildrenIndex,
  refreshAttributeChildrenFromChanges,
} from './attributeChildren'
import createLexemeIndex from './lexemes'
import { type ThoughtPayload, decodeThoughtPayload, encodeThoughtPayload } from './payload'
import { applyMaterializedThoughtsToStore } from './sync'
import type { MaterializationContext } from './sync/applyMaterializedThoughtsToStore'
import { SYSTEM_ROOT_THOUGHT_IDS } from './systemThoughtIds'
import { createTreecrdtLocalWriteOptions, waitForTreecrdtWriteBarrier, withTreecrdtWriteBarrier } from './writeBarrier'

type TreecrdtPlacement = { type: 'first' } | { type: 'last' } | { type: 'after'; after: ThoughtId }

type TreecrdtReadModel = Pick<DataProvider, 'getLexemeById' | 'getLexemesByIds' | 'getThoughtById' | 'getThoughtsByIds'>

type BoundTreecrdtDataProvider = TreecrdtReadModel & {
  updateThoughts: DataProvider['updateThoughts']
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

/** Shares child-order reads within one read or committed refresh, never across writes. */
const createThoughtReader = (client: TreecrdtClient) => {
  const childOrders = new Map<string, Promise<Map<ThoughtId, number>>>()
  /** Reads each parent's child order once, including concurrent requests for that parent. */
  const readChildOrder = (parentId: string): Promise<Map<ThoughtId, number>> => {
    let children = childOrders.get(parentId)
    if (!children) {
      children = client.tree.children(parentId).then(ids => new Map(ids.map((id, rank) => [id as ThoughtId, rank])))
      childOrders.set(parentId, children)
    }
    return children
  }
  return async (id: ThoughtId): Promise<Thought | undefined> => {
    // TreeCRDT retains deleted payloads; EM reads expose only live thoughts.
    if (!(await client.tree.exists(id))) return undefined
    const payloadBytes = await client.tree.getPayload(id)
    if (payloadBytes === null) return undefined

    const payload = decodeThoughtPayload(payloadBytes)

    const parentIdRaw = await client.tree.parent(id)
    const parentId: ThoughtId = parentIdRaw === null ? (ROOT_PARENT_ID as ThoughtId) : (parentIdRaw as ThoughtId)
    const rank = parentIdRaw === null ? 0 : ((await readChildOrder(parentIdRaw)).get(id) ?? 0)

    const childIds = [...(await readChildOrder(id)).keys()]
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
}

/**
 * Compatibility fallback for direct provider inserts and placements whose sibling anchor disappeared.
 * Redux writes capture explicit placement before storage normalizes display ranks.
 */
const getRankPlacement = async (
  client: TreecrdtClient,
  parentId: ThoughtId,
  thoughtId: ThoughtId,
  rank: number | undefined,
): Promise<TreecrdtPlacement> => {
  const childIds = await client.tree.children(parentId)
  // An explicit placement needs no numeric rank unless its anchor has disappeared.
  const previousParent = rank === undefined ? await client.tree.parent(thoughtId) : null
  const previousSiblings =
    previousParent === null ? [] : previousParent === parentId ? childIds : await client.tree.children(previousParent)
  const targetRank = rank ?? Math.max(0, previousSiblings.indexOf(thoughtId))
  const afterId = childIds.reduce<ThoughtId | undefined>(
    (previousId, childId, index) => (childId !== thoughtId && index < targetRank ? (childId as ThoughtId) : previousId),
    undefined,
  )

  return afterId ? { type: 'after', after: afterId } : { type: 'first' }
}

/** Resolves caller-provided TreeCRDT placement, falling back to rank when old callers or stale siblings omit it. */
const getTreecrdtPlacement = async (
  client: TreecrdtClient,
  thoughtId: ThoughtId,
  thought: { parentId: ThoughtId; rank?: number },
  movePlacements?: Index<ThoughtId | null>,
  options?: { requireExplicit?: boolean },
): Promise<TreecrdtPlacement> => {
  const parentId = thought.parentId

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
  { client, replicaId }: { client: TreecrdtClient; replicaId: Uint8Array },
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
    const existingBytes = exists ? await client.tree.getPayload(thoughtId) : null
    const existing = existingBytes ? decodeThoughtPayload(existingBytes) : undefined
    const existingParent = exists ? await client.tree.parent(thoughtId) : null
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
    const thought = {
      ...existing,
      ...patch,
      parentId: patch.parentId ?? existingParent ?? ROOT_PARENT_ID,
    } as ThoughtPayload & { parentId: ThoughtId; rank?: number }
    const payloadBytes = encodeThoughtPayload({
      value: thought.value,
      created: thought.created,
      lastUpdated: thought.lastUpdated,
      updatedBy: thought.updatedBy,
      ...(thought.archived !== undefined && { archived: thought.archived }),
    })

    const parentId = thought.parentId

    if (!exists) {
      const placement = await getTreecrdtPlacement(client, thoughtId, thought, movePlacements)
      ops.push(await client.local.insert(replicaId, parentId, thoughtId, placement, payloadBytes, writeOptions))
    } else {
      if (!existing) continue
      lexemeKeys.add(hashThought(existing.value))

      const parentChanged = (existingParent ?? ROOT_PARENT_ID) !== thought.parentId
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
    }
  }

  // Move surviving children first: a later move can revive a defensively deleted ancestor.
  for (const id of deletes) {
    const payload = await client.tree.getPayload(id)
    if (payload) lexemeKeys.add(hashThought(decodeThoughtPayload(payload).value))
    ops.push(await client.local.delete(replicaId, id, writeOptions))
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
}

/**
 * Creates the stable app-facing TreeCRDT data provider.
 *
 * The runtime supplies its client during initialization. Reads and writes wait for it; a failed initialization
 * or drop rejects those calls so a later initialization can start cleanly.
 */
const createTreecrdtDataProvider = () => {
  let activeDb: BoundTreecrdtDataProvider | null = null
  let providerReadiness = createProviderReadiness()

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
    updateThoughts: updates =>
      activeDb ? activeDb.updateThoughts(updates) : providerReadiness.promise.then(db => db.updateThoughts(updates)),
    // Freeing cache entries remains a no-op before initialization.
    freeThought: async _id => undefined,
    freeLexeme: async _key => undefined,
  } satisfies Omit<DataProvider, 'clear'>

  /** Seeds the supplied client, creates its provider, and then releases queued startup calls. */
  const bindClient = async (
    client: TreecrdtClient,
    replicaId: Uint8Array,
    materialization?: ThoughtspaceMaterializationBridge,
  ): Promise<{ syncClient: TreecrdtWebSocketSyncClient; closeBinding: () => Promise<void> }> => {
    if (activeDb) throw new Error('TreeCRDT DataProvider: client already bound')
    await initializeThoughtspaceStorage(client, replicaId)

    const lexemes = await createLexemeIndex(client)
    await client.runner.exec(`CREATE TABLE IF NOT EXISTS em_derived_indexes_meta (
      id INTEGER PRIMARY KEY CHECK (id = 1), version INTEGER NOT NULL, head_seq INTEGER NOT NULL
    )`)
    /** Marks a frontier complete only after both derived indexes have caught up. */
    const checkpointIndexes = (headSeq: number) =>
      client.runner.getText(
        'INSERT OR REPLACE INTO em_derived_indexes_meta (id, version, head_seq) VALUES (1, 1, ?1)',
        [headSeq],
      )
    const { headSeq } = JSON.parse((await client.runner.getText('SELECT treecrdt_ensure_materialized()'))!) as {
      headSeq: number
    }
    const indexedHead = await client.runner.getText('SELECT head_seq FROM em_derived_indexes_meta WHERE version = 1')
    if (indexedHead === null || Number(indexedHead) !== headSeq) {
      // Invalidate before rebuilding so an interrupted rebuild is retried on the next open.
      await client.runner.exec('DELETE FROM em_derived_indexes_meta')
      await rebuildAttributeChildrenIndex(client)
      await lexemes.rebuild()
      await checkpointIndexes(headSeq)
    }
    const clientDb: TreecrdtReadModel = {
      getLexemeById: lexemes.getLexemeById,
      getLexemesByIds: lexemes.getLexemesByIds,
      getThoughtById: id => createThoughtReader(client)(id),
      getThoughtsByIds: async ids => {
        // Simulate slow local materialization after refresh in e2e tests.
        if (testFlags.replicationDelay > 0) await sleep(testFlags.replicationDelay)
        return Promise.all(ids.map(createThoughtReader(client)))
      },
    }
    const materializationContext: MaterializationContext = {
      bridge: materialization,
      db: clientDb,
      pending: [],
    }
    let acceptingWork = true
    let storageJobRunning = false
    let indexedEvents = 0
    let indexFailure: { error: unknown } | undefined

    /** Updates buffered events, including recovery events emitted during these reads. */
    const flushIndexes = async (): Promise<void> => {
      if (indexFailure) throw indexFailure.error
      const previousCount = indexedEvents
      try {
        while (indexedEvents < materializationContext.pending.length) {
          const entry = materializationContext.pending[indexedEvents]
          await refreshAttributeChildrenFromChanges(client, entry.event.changes)
          entry.keys = await lexemes.applyChanges(entry.event.changes)
          indexedEvents += 1
        }
        if (indexedEvents !== previousCount) {
          await checkpointIndexes(materializationContext.pending[indexedEvents - 1].event.headSeq)
        }
      } catch (error) {
        // Do not let later work checkpoint over a partially updated index; reopening rebuilds both.
        indexFailure = { error }
        throw error
      }
    }

    /** Finishes indexing and publication before another external storage call may start. */
    const runStorageJob = <T>(
      work: () => Promise<T>,
      confirmation?: Parameters<typeof applyMaterializedThoughtsToStore>[1],
    ): Promise<T> => {
      if (!acceptingWork) return Promise.reject(new Error('TreeCRDT client binding is closed.'))
      return withTreecrdtWriteBarrier(async () => {
        storageJobRunning = true
        try {
          await flushIndexes()
          return await work()
        } finally {
          try {
            await flushIndexes()
            indexedEvents = 0
            await applyMaterializedThoughtsToStore(
              { ...materializationContext, db: { ...clientDb, getThoughtById: createThoughtReader(client) } },
              confirmation,
            )
          } finally {
            storageJobRunning = false
          }
        }
      })
    }

    /** Persists one Redux flush and confirms it with the resulting read model, including no-ops. */
    const persistPushQueueBatches: BoundTreecrdtDataProvider['persistPushQueueBatches'] = batches => {
      const confirmation: NonNullable<Parameters<typeof applyMaterializedThoughtsToStore>[1]> = {
        generation: undefined,
        writeIds: batches.flatMap(batch => (batch.writeId ? [batch.writeId] : [])),
        lexemeIndex: {},
      }
      return runStorageJob(async () => {
        const generation = materialization?.getGeneration()
        const results: Awaited<ReturnType<typeof updateThoughtsForClient>>[] = []
        for (const batch of batches) results.push(await updateThoughtsForClient({ client, replicaId }, batch))
        await flushIndexes()
        const keys = [...new Set(results.flatMap(result => result.lexemeKeys))]
        const values = await clientDb.getLexemesByIds(keys)
        const lexemeIndex = Object.fromEntries(keys.map((key, i) => [key, values[i] ?? null]))
        // Assign only after success: a failed batch may publish partial storage, but must not confirm its writes.
        confirmation.generation = generation
        confirmation.lexemeIndex = lexemeIndex
        return results.map(({ operations }) => ({ operations, lexemeIndex }))
      }, confirmation)
    }

    const unsubscribeMaterialized = client.onMaterialized(event => {
      materializationContext.pending.push({ event, keys: [], generation: materialization?.getGeneration() })
      // The active job owns completion. Only unsolicited events need another job.
      if (acceptingWork && !storageJobRunning && materializationContext.pending.length === 1) {
        void runStorageJob(async () => undefined).catch(err =>
          console.error('TreeCRDT materialization refresh failed', err),
        )
      }
    })

    /** A recovering read can precede its derived index updates; finish those before returning a read model. */
    const read = <T>(work: () => Promise<T>): Promise<T> =>
      runStorageJob(async () => {
        const previousEventCount = materializationContext.pending.length
        const result = await work()
        if (materializationContext.pending.length === previousEventCount) return result
        await flushIndexes()
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
        exec: sql => runStorageJob(async () => client.runner.exec(sql)),
        getText: (sql, params) => runStorageJob(async () => client.runner.getText(sql, params)),
      },
      meta: {
        headLamport: () => runStorageJob(() => client.meta.headLamport()),
        replicaMaxCounter: replica => runStorageJob(() => client.meta.replicaMaxCounter(replica)),
      },
      opRefs: {
        all: () => runStorageJob(() => client.opRefs.all()),
        children: parent => runStorageJob(() => client.opRefs.children(parent)),
      },
      ops: {
        append: (op, options) => runStorageJob(() => client.ops.append(op, options)),
        appendMany: (ops, options?: WriteOptions) => runStorageJob(() => client.ops.appendMany(ops, options)),
        all: () => runStorageJob(() => client.ops.all()),
        since: (lamport, root) => runStorageJob(() => client.ops.since(lamport, root)),
        children: parent => runStorageJob(() => client.ops.children(parent)),
        get: refs => runStorageJob(() => client.ops.get(refs)),
      },
    }
    return {
      syncClient,
      closeBinding: async () => {
        if (!acceptingWork) return
        acceptingWork = false
        try {
          await waitForTreecrdtWriteBarrier()
          await flushIndexes()
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
