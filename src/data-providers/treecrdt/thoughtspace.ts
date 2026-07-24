import type { Operation } from '@treecrdt/interface'
import type { TreecrdtClient } from '@treecrdt/wa-sqlite'
import type Index from '../../@types/IndexType'
import type Lexeme from '../../@types/Lexeme'
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
import type { ThoughtspaceMaterializationBridge } from '../thoughtspace'
import {
  deleteAttributeChild,
  ensureAttributeChildrenIndexReady,
  getAttributeChildrenByParent,
  upsertAttributeChild,
} from './attributeChildren'
import {
  deleteAllLexemes,
  deleteLexeme as deleteLexemeRow,
  ensureLexemesSchema,
  getLexemeById as getLexemeByIdSql,
  getLexemesByIds as getLexemesByIdsSql,
  upsertLexeme,
} from './lexemes'
import { decodeThoughtPayload, encodeThoughtPayload } from './payload'
import { enqueueMaterializedThoughtsToStore } from './sync'
import { SYSTEM_ROOT_THOUGHT_IDS } from './systemThoughtIds'
import { createTreecrdtLocalWriteOptions, isTreecrdtLocalMaterialization } from './writeBarrier'

type TreecrdtPlacement = { type: 'first' } | { type: 'last' } | { type: 'after'; after: ThoughtId }

type TreecrdtThoughtspaceSessionIdentity = Readonly<{
  client: TreecrdtClient
  replicaId: Uint8Array
}>

type TreecrdtSessionDataProvider = Pick<
  DataProvider,
  'getLexemeById' | 'getLexemesByIds' | 'getThoughtById' | 'getThoughtsByIds' | 'updateThoughts'
> &
  Required<Pick<DataProvider, 'updateLexemeIndex'>>

type TreecrdtThoughtspaceSession = TreecrdtThoughtspaceSessionIdentity &
  Readonly<{
    db: TreecrdtSessionDataProvider
  }>

type Deferred<T> = {
  promise: Promise<T>
  reject: (reason: unknown) => void
  resolve: (value: T) => void
  settled: boolean
}

/** Creates the private gate used by writes that race startup. */
const createDeferred = <T>(): Deferred<T> => {
  let resolvePromise!: (value: T) => void
  let rejectPromise!: (reason: unknown) => void
  const promise = new Promise<T>((resolve, reject) => {
    resolvePromise = resolve
    rejectPromise = reject
  })

  // The public write that awaits this promise observes the rejection. This catch prevents an unhandled rejection when
  // a session fails or drops before any pre-init write has subscribed.
  void promise.catch(() => undefined)

  const deferred: Deferred<T> = {
    promise,
    settled: false,
    resolve: value => {
      if (deferred.settled) return
      deferred.settled = true
      resolvePromise(value)
    },
    reject: reason => {
      if (deferred.settled) return
      deferred.settled = true
      rejectPromise(reason)
    },
  }

  return deferred
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
  let after: Thought | undefined

  for (const childId of childIds) {
    if (childId === thoughtId) continue
    const child = await getThoughtByIdFromClient(client, childId as ThoughtId)
    if (child && child.rank < rank && (!after || child.rank > after.rank)) {
      after = child
    }
  }

  return after ? { type: 'after', after: after.id } : { type: 'first' }
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

/** Applies thought index updates and move placements to one exact TreeCRDT session. */
const updateThoughtsForSession = async (
  { client, replicaId }: TreecrdtThoughtspaceSessionIdentity,
  { thoughtIndexUpdates, lexemeIndexUpdates, movePlacements }: Parameters<DataProvider['updateThoughts']>[0],
): Promise<readonly Operation[]> => {
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

/** Replaces all stored lexemes in one exact TreeCRDT session. */
const updateLexemeIndexForClient = async (client: TreecrdtClient, lexemeIndex: Index<Lexeme>): Promise<void> => {
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

/** Seeds TreeCRDT storage for an em thoughtspace session. */
const initializeThoughtspaceSession = async (client: TreecrdtClient, replicaId: Uint8Array): Promise<void> => {
  await ensureLexemesSchema(client)
  // Ensure root has payload so getThoughtById can use the generic path.
  await client.local.payload(replicaId, GLOBAL_ROOT_TOKEN, ROOT_PAYLOAD, createTreecrdtLocalWriteOptions())
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

  await ensureAttributeChildrenIndexReady(client)
}

/** Creates a data provider whose operations are permanently bound to one TreeCRDT session. */
const createSessionDataProvider = ({
  client,
  replicaId,
}: TreecrdtThoughtspaceSessionIdentity): TreecrdtSessionDataProvider => ({
  getLexemeById: key => getLexemeByIdSql(client, key),
  getLexemesByIds: keys => getLexemesByIdsSql(client, keys),
  getThoughtById: id => getThoughtByIdFromClient(client, id),
  getThoughtsByIds: async ids => {
    await waitForTestReplicationDelay()
    return Promise.all(ids.map(id => getThoughtByIdFromClient(client, id)))
  },
  updateThoughts: updates => updateThoughtsForSession({ client, replicaId }, updates),
  updateLexemeIndex: lexemeIndex => updateLexemeIndexForClient(client, lexemeIndex),
})

/**
 * Creates a TreeCRDT data provider bound by its owner to one client session at a time.
 *
 * Writes issued while app initialization is delayed wait on this provider's private session gate. A failed init or a
 * drop before init rejects that gate; the next init rotates to a fresh gate so work cannot leak into another client.
 */
const createTreecrdtDataProvider = () => {
  let activeSession: TreecrdtThoughtspaceSession | null = null
  let sessionGate = createDeferred<TreecrdtThoughtspaceSession>()

  /** Returns the active session for reads that are only valid after runtime initialization. */
  const getActiveSession = (): TreecrdtThoughtspaceSession => {
    if (!activeSession) throw new Error('TreeCRDT DataProvider: init not called')
    return activeSession
  }

  /** Dispatches public reads to the active session without exposing its client. */
  const getActiveDb = (): TreecrdtSessionDataProvider => getActiveSession().db

  /** Dispatches public writes through the startup gate, retaining whichever session releases that write. */
  const updateThoughts: DataProvider['updateThoughts'] = async updates =>
    (await sessionGate.promise).db.updateThoughts(updates)

  /** Detaches the current session, rejects startup writes, and rotates to a fresh gate. */
  const resetSession = (reason: unknown): void => {
    sessionGate.reject(reason)
    activeSession = null
    sessionGate = createDeferred<TreecrdtThoughtspaceSession>()
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
    updateLexemeIndex: lexemeIndex => getActiveDb().updateLexemeIndex(lexemeIndex),
  } satisfies Omit<DataProvider, 'clear'>

  /** Seeds and binds the exact client supplied by the owner, then releases queued startup writes. */
  const bindSession = async (
    client: TreecrdtClient,
    replicaId: Uint8Array,
    materialization?: ThoughtspaceMaterializationBridge,
  ): Promise<() => void> => {
    if (activeSession) throw new Error('TreeCRDT DataProvider: session already initialized')
    await initializeThoughtspaceSession(client, replicaId)

    const sessionIdentity = { client, replicaId }
    const session = {
      ...sessionIdentity,
      db: createSessionDataProvider(sessionIdentity),
    }

    const unsubscribeMaterialized = client.onMaterialized(event => {
      // Local writes are already reflected optimistically. Other materialization uses the exact provider and client
      // that created this subscription, even if the app later initializes a new session.
      if (isTreecrdtLocalMaterialization(event) || !materialization) return

      void enqueueMaterializedThoughtsToStore(event, materialization, client, session.db).catch(err =>
        console.error('TreeCRDT materialized UI sync failed', err),
      )
    })

    activeSession = session
    sessionGate.resolve(session)
    let subscribed = true
    return () => {
      if (!subscribed) return
      subscribed = false
      unsubscribeMaterialized()
    }
  }

  return {
    db,
    bindSession,
    resetSession,
  }
}

export default createTreecrdtDataProvider
