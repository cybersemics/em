import type { Operation } from '@treecrdt/interface'
import type { MaterializationEvent, TreecrdtReadNode, TreecrdtReadResult } from '@treecrdt/interface/engine'
import type { TreecrdtClient } from '@treecrdt/wa-sqlite'
import type Index from '../../@types/IndexType'
import type Thought from '../../@types/Thought'
import type ThoughtId from '../../@types/ThoughtId'
import type Timestamp from '../../@types/Timestamp'
import { EM_TOKEN, GLOBAL_ROOT_TOKEN, ROOT_PARENT_ID, SETTINGS_TOKEN, SETTINGS_VALUE } from '../../constants'
import testFlags from '../../e2e/testFlags'
import { childrenMapKey } from '../../util/createChildrenMap'
import sleep from '../../util/sleep'
import type { DataProvider } from '../DataProvider'
import type { ThoughtspaceMaterializationBridge } from '../thoughtspace'
import createLexemeIndex from './lexemes'
import { decodeThoughtPayload, encodeThoughtPayload } from './payload'
import { type MaterializationContext, applyMaterializedThoughtsToStore } from './sync/applyMaterializedThoughtsToStore'
import { enqueueMaterializedThoughtsToStoreWork } from './sync/materializationQueue'
import { SYSTEM_ROOT_THOUGHT_IDS } from './systemThoughtIds'
import { createTreecrdtLocalWriteOptions } from './writeBarrier'

type TreecrdtPlacement = { type: 'first' } | { type: 'last' } | { type: 'after'; after: ThoughtId }

type TreecrdtClientDataProvider = Pick<
  DataProvider,
  'getLexemeById' | 'getLexemesByIds' | 'getThoughtById' | 'getThoughtsByIds' | 'updateThoughts'
>

/** Creates the private provider-readiness state used by writes that race startup. */
const createProviderReadiness = () => {
  let resolve!: (db: TreecrdtClientDataProvider) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<TreecrdtClientDataProvider>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })

  // A public write observes this rejection. This catch only prevents an unhandled rejection when no write was waiting.
  void promise.catch(() => undefined)

  return { promise, reject, resolve }
}

/** Injects delayed TreeCRDT reads for e2e tests that exercise slow local materialization after refresh. */
const waitForTestReplicationDelay = async (): Promise<void> => {
  if (testFlags.replicationDelay > 0) {
    await sleep(testFlags.replicationDelay)
  }
}

/** Maps a TreeCRDT node read to a thought. Keying attribute children by value needs the child payloads. */
const nodeToThought = (id: ThoughtId, node: TreecrdtReadNode | null): Thought | undefined => {
  if (!node?.payload) return undefined

  const payload = decodeThoughtPayload(node.payload)

  const childrenMap: Index<ThoughtId> = {}
  for (const child of node.children) {
    const childId = child.id as ThoughtId
    const value = child.payload && decodeThoughtPayload(child.payload).value
    childrenMap[value ? childrenMapKey(childrenMap, { id: childId, value }) : childId] = childId
  }

  const thought: Thought = {
    id,
    value: payload.value,
    rank: node.index,
    created: payload.created as Timestamp,
    lastUpdated: payload.lastUpdated as Timestamp,
    updatedBy: payload.updatedBy,
    parentId: (node.parent ?? ROOT_PARENT_ID) as ThoughtId,
    childrenMap,
    ...(payload.archived !== undefined && { archived: payload.archived as Timestamp }),
  }

  return thought
}

/** Reads thoughts in the order of `ids` with one TreeCRDT read. */
const readThoughts = async (client: TreecrdtClient, ids: ThoughtId[]): Promise<(Thought | undefined)[]> => {
  if (ids.length === 0) return []
  const { nodes } = await client.tree.read(ids, { children: { payloads: true } })
  return ids.map(id => nodeToThought(id, nodes[id]))
}

/** Converts em's root parent id to TreeCRDT's global root id. */
const treeParentId = (id: ThoughtId): ThoughtId => (id === ROOT_PARENT_ID ? GLOBAL_ROOT_TOKEN : id)

/**
 * Derives TreeCRDT relative placement from em's numeric rank payload.
 * This is the compatibility bridge while the app still treats rank as canonical display order.
 * TODO: Remove when create/import/newThought paths pass explicit placement and selectors read provider-backed order.
 */
const getRankPlacement = (parent: TreecrdtReadNode | null, thoughtId: ThoughtId, rank: number): TreecrdtPlacement => {
  const afterId = (parent?.children ?? []).reduce<ThoughtId | undefined>(
    (previousId, child, index) => (child.id !== thoughtId && index < rank ? (child.id as ThoughtId) : previousId),
    undefined,
  )

  return afterId ? { type: 'after', after: afterId } : { type: 'first' }
}

/** Resolves caller-provided TreeCRDT placement, falling back to rank when old callers or stale siblings omit it. */
const getTreecrdtPlacement = (
  nodes: TreecrdtReadResult['nodes'],
  thoughtId: ThoughtId,
  thought: Thought,
  movePlacements?: Index<ThoughtId | null>,
  options?: { requireExplicit?: boolean },
): TreecrdtPlacement => {
  const parentId = treeParentId(thought.parentId)

  if (!movePlacements || !Object.prototype.hasOwnProperty.call(movePlacements, thoughtId)) {
    if (options?.requireExplicit) {
      throw new Error(`TreeCRDT move for ${thoughtId} requires explicit placement.`)
    }
    return getRankPlacement(nodes[parentId], thoughtId, thought.rank)
  }

  const afterId = movePlacements[thoughtId]
  if (afterId == null) return { type: 'first' }
  if (afterId === thoughtId) throw new Error(`TreeCRDT move for ${thoughtId} cannot be placed after itself.`)

  if (nodes[afterId]?.parent !== parentId) {
    return getRankPlacement(nodes[parentId], thoughtId, thought.rank)
  }

  return { type: 'after', after: afterId }
}

/** Applies thought index updates and move placements to one exact TreeCRDT client. */
const updateThoughtsForClient = async (
  client: TreecrdtClient,
  replicaId: Uint8Array,
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

  for (const [id, thought] of Object.entries(updates)) {
    const thoughtId = id as ThoughtId
    const payloadBytes = encodeThoughtPayload({
      value: thought.value,
      created: thought.created,
      lastUpdated: thought.lastUpdated,
      updatedBy: thought.updatedBy,
      ...(thought.archived !== undefined && { archived: thought.archived }),
    })

    const parentId = treeParentId(thought.parentId)
    const afterId = movePlacements?.[thoughtId]
    // One read before each write, so a thought placed by rank sees the siblings written before it. The comparison
    // below reads only the thought's own fields, so it needs no child payloads.
    const { nodes } = await client.tree.read([thoughtId, parentId, ...(afterId ? [afterId] : [])])

    if (!nodes[thoughtId]) {
      const placement = getTreecrdtPlacement(nodes, thoughtId, thought, movePlacements)
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
    } else {
      const existing = nodeToThought(thoughtId, nodes[thoughtId])
      if (!existing) continue

      const parentChanged = existing.parentId !== thought.parentId
      const orderChanged = thoughtId in (movePlacements || {})
      if (parentChanged || orderChanged) {
        const placement = getTreecrdtPlacement(nodes, thoughtId, thought, movePlacements, {
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
    }
  }

  // Moves out of a deleted parent must precede its delete, so its knownState covers the move.
  for (const id of deletes) {
    ops.push(await client.local.delete(replicaId, id, createTreecrdtLocalWriteOptions()))
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
  if ((await client.tree.root.payload()) === null) {
    await client.local.payload(replicaId, GLOBAL_ROOT_TOKEN, ROOT_PAYLOAD, createTreecrdtLocalWriteOptions())
  }
  for (const id of SYSTEM_ROOT_THOUGHT_IDS) {
    if (!(await client.tree.get(id))) {
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

  // em/Settings may already exist, possibly under another id.
  for (const child of await client.tree.node(EM_TOKEN).children()) {
    const payloadBytes = await child.payload()
    if (payloadBytes && decodeThoughtPayload(payloadBytes).value === SETTINGS_VALUE) return
  }
  if ((await client.tree.node(SETTINGS_TOKEN).parent())?.id === EM_TOKEN) return

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

/** Bump when an index is added or changes, so databases indexed by an older version are rebuilt once. */
const INDEX_VERSION = 2

/**
 * Creates the stable app-facing TreeCRDT data provider.
 *
 * The runtime supplies its client during initialization. Writes that race initialization wait for it; a failed
 * initialization or drop rejects those writes so a later initialization can start cleanly.
 */
const createTreecrdtDataProvider = () => {
  let activeDb: TreecrdtClientDataProvider | null = null
  let providerReadiness = createProviderReadiness()

  /** Returns the active client provider for reads that are only valid after runtime initialization. */
  const getActiveDb = (): TreecrdtClientDataProvider => {
    if (!activeDb) throw new Error('TreeCRDT DataProvider: init not called')
    return activeDb
  }

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
    getLexemeById: key => getActiveDb().getLexemeById(key),
    getLexemesByIds: keys => getActiveDb().getLexemesByIds(keys),
    getThoughtById: id => getActiveDb().getThoughtById(id),
    getThoughtsByIds: ids => getActiveDb().getThoughtsByIds(ids),
    updateThoughts,
    // Freeing cache entries remains a no-op before initialization.
    freeThought: async _id => undefined,
    freeLexeme: async _key => undefined,
  } satisfies Omit<DataProvider, 'clear'>

  /** Seeds the supplied client, creates its provider, and then releases queued startup writes. */
  const bindClient = async (
    client: TreecrdtClient,
    replicaId: Uint8Array,
    materialization?: ThoughtspaceMaterializationBridge,
  ): Promise<() => Promise<void>> => {
    if (activeDb) throw new Error('TreeCRDT DataProvider: client already bound')
    await initializeThoughtspaceStorage(client, replicaId)

    // TreeCRDT remembers how far the derived indexes got and catches them up after a gap such as startup or a failed
    // update. The startup catch-up runs before `publish` is set and publishes nothing; Redux loads lexemes on demand.
    let publish: ((event: MaterializationEvent, keys: string[]) => void) | undefined
    const lexemes = await createLexemeIndex(client)
    const indexes = await client.onMaterializedDurable(
      'em-derived-indexes',
      async event => {
        const keys = await lexemes.applyChanges(event.changes)
        publish?.(event, keys)
      },
      {
        version: INDEX_VERSION,
        reset: () => lexemes.clear(),
        onError: err => console.error('TreeCRDT derived indexing failed', err),
      },
    )

    const clientDb: TreecrdtClientDataProvider = {
      getLexemeById: async key => (await clientDb.getLexemesByIds([key]))[0],
      getLexemesByIds: async keys => {
        await indexes.idle()
        return lexemes.getLexemesByIds(keys)
      },
      getThoughtById: async id => (await readThoughts(client, [id]))[0],
      getThoughtsByIds: async ids => {
        await waitForTestReplicationDelay()
        return readThoughts(client, ids)
      },
      updateThoughts: async updates => {
        if (updates.favoriteOrder) await lexemes.setFavoriteOrder(updates.favoriteOrder)
        return updateThoughtsForClient(client, replicaId, updates)
      },
    }

    // A publication is queued only once its event is indexed, so the idle barrier waits for the indexes too.
    const unsubscribeMaterialized = client.onMaterialized(
      () => void enqueueMaterializedThoughtsToStoreWork(() => indexes.idle()),
    )
    if (materialization) {
      const context: MaterializationContext = {
        bridge: materialization,
        db: clientDb,
        pending: [],
        isActive: () => activeDb === clientDb,
      }
      publish = (event, keys) => {
        context.pending.push({ event, keys })
        // Each event queues a publication; one that finds the buffer already drained returns at once.
        void enqueueMaterializedThoughtsToStoreWork(() => applyMaterializedThoughtsToStore(context)).catch(err =>
          console.error('TreeCRDT materialized UI sync failed', err),
        )
      }
    }

    activeDb = clientDb
    providerReadiness.resolve(clientDb)
    return async () => {
      unsubscribeMaterialized()
      await indexes.close()
    }
  }

  return {
    db,
    bindClient,
    resetBinding,
  }
}

export default createTreecrdtDataProvider
