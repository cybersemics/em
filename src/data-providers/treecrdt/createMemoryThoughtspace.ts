import type { Operation, OperationId } from '@treecrdt/interface'
import type { SyncSubscription } from '@treecrdt/sync-protocol'
import { createInMemoryConnectedPeers } from '@treecrdt/sync-protocol/in-memory'
import { treecrdtSyncV0ProtobufCodec } from '@treecrdt/sync-protocol/protobuf'
import { createTreecrdtSyncBackendFromClient } from '@treecrdt/sync-sqlite'
import { type TreecrdtClient, createTreecrdtClient } from '@treecrdt/wa-sqlite'
import {
  type MemoryChanges,
  type MemoryContent,
  type MemoryProjection,
  type MemoryReader,
  type MemoryRow,
  type MemoryTransaction,
  createMemoryClient,
} from '@treecrdt/wasm/memory'
import { createMemorySyncBackend } from '@treecrdt/wasm/sync'
import _ from 'lodash'
import type Lexeme from '../../@types/Lexeme'
import type Thought from '../../@types/Thought'
import type ThoughtId from '../../@types/ThoughtId'
import type ThoughtspaceTransaction from '../../@types/ThoughtspaceTransaction'
import type ThoughtspaceView from '../../@types/ThoughtspaceView'
import { GLOBAL_ROOT_TOKEN, ROOT_PARENT_ID } from '../../constants'
import createId from '../../util/createId'
import hashThought from '../../util/hashThought'
import type DataProvider from '../DataProvider'
import { initPermissionsStore } from '../permissionsStore'
import type { ThoughtspaceRuntime, ThoughtspaceRuntimeInitOptions } from '../thoughtspace'
import { clientIdReady, tsid } from '../thoughtspaceSession'
import initializeMemoryStorage from './initializeMemoryStorage'
import { decodeThoughtPayload, encodeThoughtPayload } from './payload'
import acquireTreecrdtSessionLock from './sessionLock'
import { SYSTEM_ROOT_THOUGHT_IDS } from './systemThoughtIds'

const ROOT_IDS = new Set<string>([GLOBAL_ROOT_TOKEN, ...SYSTEM_ROOT_THOUGHT_IDS])

/** Decodes owned content; topology remains in TreeCRDT. */
const readThought = (row: MemoryContent | undefined): Thought | undefined => {
  if (!row?.payload) return undefined
  const payload = decodeThoughtPayload(row.payload)
  if (typeof payload?.value !== 'string') throw new TypeError('A thought payload requires a text value')
  return Object.freeze({
    ...payload,
    id: row.id as ThoughtId,
    parentId: (row.parentId ?? ROOT_PARENT_ID) as ThoughtId,
  }) as Thought
}

/** Keeps committed memberships; transaction queries overlay native changes without mutating that index. */
const createLexemeLookup = (reader: Pick<MemoryReader, 'getContent' | 'nodeIds'>) => {
  const committed = new Map<string, Lexeme>()
  const keys = new WeakMap<MemoryContent, string | undefined>()
  type Prepared = {
    deltas: Map<string, { added: Set<ThoughtId>; removed: Set<ThoughtId> }>
    results: Map<string, Lexeme | undefined>
  }
  let memo = new WeakMap<MemoryChanges, Prepared>()
  /** Reuses keys of unchanged before/after rows across cumulative transaction reads. */
  const keyOf = (row: MemoryContent | null | undefined) => {
    if (!row || ROOT_IDS.has(row.id)) return undefined
    if (!keys.has(row)) {
      const thought = readThought(row)
      keys.set(row, thought ? hashThought(thought.value) : undefined)
    }
    return keys.get(row)
  }
  /** Decodes a batch once; failed preparation leaves committed memberships and previous queries intact. */
  const prepare = (batch: MemoryChanges): Prepared => {
    const cached = memo.get(batch)
    if (cached) return cached
    const deltas: Prepared['deltas'] = new Map()
    /** Collects additions and removals only for affected values. */
    const bucket = (key: string) => {
      if (!deltas.has(key)) deltas.set(key, { added: new Set(), removed: new Set() })
      return deltas.get(key)!
    }
    if (batch.reset) {
      committed.forEach((_, key) => bucket(key))
      reader.nodeIds().forEach(id => {
        const key = keyOf(reader.getContent(id))
        if (key !== undefined) bucket(key).added.add(id as ThoughtId)
      })
    } else {
      batch.changes.forEach(({ id, before, after }) => {
        if (before && after && _.isEqual(before.payload, after.payload)) return
        const oldKey = keyOf(before)
        const newKey = keyOf(after)
        if (oldKey === newKey) return
        if (oldKey !== undefined) bucket(oldKey).removed.add(id as ThoughtId)
        if (newKey !== undefined) bucket(newKey).added.add(id as ThoughtId)
      })
    }
    const prepared: Prepared = { deltas, results: new Map() }
    memo.set(batch, prepared)
    return prepared
  }
  /** Reads one immutable membership list, optionally including the active transaction. */
  const get = (key: string, batch?: MemoryChanges): Lexeme | undefined => {
    const previous = committed.get(key)
    if (!batch) return previous
    const { deltas, results } = prepare(batch)
    const delta = deltas.get(key)
    if (!delta) return previous
    if (!results.has(key)) {
      const ids = new Set(batch.reset ? undefined : previous)
      delta.removed.forEach(id => ids.delete(id))
      delta.added.forEach(id => ids.add(id))
      const next = [...ids].sort()
      results.set(key, _.isEqual(previous, next) ? previous : next.length ? Object.freeze(next) : undefined)
    }
    return results.get(key)
  }
  /** Installs complete prepared results before any editor callback can read the new document. */
  const commit = (batch: MemoryChanges) => {
    const { deltas, results } = prepare(batch)
    deltas.forEach((_, key) => get(key, batch))
    results.forEach((ids, key) => (ids ? committed.set(key, ids) : committed.delete(key)))
    memo = new WeakMap()
  }
  commit({ revision: 0, reset: true, changes: [] })
  return { get, prepare, commit }
}

/** Adapts callback-scoped rows without copying the tree or deriving lexemes. */
const memoryReader = (
  reader: Pick<MemoryReader, 'getContent' | 'getChildren' | 'getPosition'>,
  nodeIds: () => Iterable<string>,
  check: () => void,
): Omit<ThoughtspaceView, 'getLexeme' | 'revision'> => {
  const children = new Map<string, readonly ThoughtId[]>()
  /** Decodes content through the lifetime-checked reader. */
  const getThought = (id: ThoughtId) => readThought(reader.getContent(id))
  return {
    getThought,
    getChildren: id => {
      // Scoped readers must expire even when EM's filtered child list is already cached.
      check()
      if (!children.has(id))
        children.set(
          id,
          Object.freeze(
            getThought(id) ? reader.getChildren(id).filter(child => !!getThought(child as ThoughtId)) : [],
          ) as readonly ThoughtId[],
        )
      return children.get(id)!
    },
    getPosition: reader.getPosition,
    *values() {
      for (const id of nodeIds()) {
        const thought = getThought(id as ThoughtId)
        if (thought) yield thought
      }
    },
  }
}

/** Encodes canonical content separately from the engine-owned structure. */
const thoughtPayload = ({ value, created, lastUpdated, updatedBy, archived }: Thought) =>
  encodeThoughtPayload({ value, created, lastUpdated, updatedBy, ...(archived !== undefined && { archived }) })

/** Owns the complete synchronous document and persists its exact operations to SQLite. */
const createMemoryThoughtspace = (
  openClient: typeof createTreecrdtClient = createTreecrdtClient,
  openMemory: typeof createMemoryClient = createMemoryClient,
): DataProvider & ThoughtspaceRuntime => {
  const localWriteId = `em-memory:${createId()}`
  const listeners = new Set<Parameters<DataProvider['subscribe']>[0]>()
  let persistent: TreecrdtClient | undefined
  let memory: Awaited<ReturnType<typeof createMemoryClient>> | undefined
  let projection: MemoryProjection<Thought> | undefined
  let peers: ReturnType<typeof createInMemoryConnectedPeers<Operation>> | undefined
  let onError: ThoughtspaceRuntimeInitOptions['onError']
  let failure: Error | undefined
  let initPromise: Promise<{ clientId: string; storage: string }> | undefined
  let dropping: Promise<void> | undefined
  let ready = false
  let commitTail = Promise.resolve()
  let syncTail = Promise.resolve()
  let subscription: SyncSubscription | undefined
  let unsubscribe: (() => void) | undefined
  let unsubscribeMemory: (() => void) | undefined
  let lexemes: ReturnType<typeof createLexemeLookup> | undefined
  let currentTransaction: MemoryTransaction | undefined
  const reader: Omit<ThoughtspaceView, 'getLexeme' | 'revision'> = {
    getThought: id => (id ? projection?.get(id) : undefined),
    getChildren: id => (projection?.getChildren(id) ?? []) as readonly ThoughtId[],
    getPosition: id => (id ? memory?.getPosition(id) : undefined),
    *values() {
      for (const id of memory?.nodeIds() ?? []) {
        const thought = projection?.get(id)
        if (thought) yield thought
      }
    },
  }
  let viewRevision = 0
  let projectionRevision: number | undefined
  /** Creates a publication identity, not a historical copy of the tree. */
  const view = (): ThoughtspaceView => ({
    ...reader,
    getLexeme: value => lexemes?.get(hashThought(value), currentTransaction?.getChanges()),
    get revision() {
      return viewRevision
    },
  })
  let currentView = view()
  let publishedRevision: number | undefined
  /** Preserves the first failure and prevents subsequent commands from authoring unsavable operations. */
  const reportFailure = (error: unknown) => {
    if (failure) return
    failure = error instanceof Error ? error : new Error(String(error))
    try {
      if (onError) onError(failure)
      else console.error('Memory TreeCRDT failed', failure)
    } catch (callbackError) {
      console.error('Memory TreeCRDT error reporting failed', callbackError)
    }
  }

  /** Invalidates subscribers, which always read the latest document even when an earlier listener commits again. */
  const notify = (previous: ReturnType<ThoughtspaceTransaction['capturePrevious']>) => {
    Array.from(listeners).forEach(listener => {
      try {
        listener(previous)
      } catch (error) {
        // A subscriber cannot roll back a committed document or prevent its other consumers from updating.
        console.error('Memory TreeCRDT subscriber failed', error)
      }
    })
  }

  /** Settles accepted writes and their loopback notifications before releasing resources. */
  const drainWork = async () => {
    let tails: Promise<void>[]
    do {
      tails = [commitTail, syncTail]
      const results = await Promise.allSettled(tails)
      results.forEach(result => {
        if (result.status === 'rejected') reportFailure(result.reason)
      })
    } while (tails[0] !== commitTail || tails[1] !== syncTail)
    if (failure) throw failure
  }

  /** Drains persistence and local loopback work, not external network synchronization. */
  const waitForIdle = async () => {
    await initPromise
    await drainWork()
  }

  /** Publishes a new view identity when TreeCRDT's transaction-consistent projection changes. */
  const project = (): ThoughtspaceView => {
    if (!ready || !projection || projection.revision === projectionRevision) return currentView
    projectionRevision = projection.revision
    viewRevision++
    currentView = view()
    return currentView
  }

  /** Supplies old rows only for changed nodes, while unchanged rows are read from the current tree. */
  const previousView = (before: () => ReadonlyMap<string, MemoryRow | null>, check: () => void) => {
    const positions = new Map<string, Map<string, number>>()
    /** Reads captured content for changed nodes and current content for unchanged nodes. */
    const getContent = (id: string) => {
      check()
      const rows = before()
      return rows.has(id) ? (rows.get(id) ?? undefined) : id ? memory?.getContent(id) : undefined
    }
    return memoryReader(
      {
        getContent,
        getChildren: id => {
          check()
          const rows = before()
          return rows.has(id) ? (rows.get(id)?.children ?? []) : (memory?.getChildren(id) ?? [])
        },
        getPosition: id => {
          const parent = getContent(id)?.parentId
          if (!parent) return undefined
          const rows = before()
          if (!rows.has(parent)) return memory?.getPosition(id)
          // Diagnostic move logging asks for every sibling's old position; index captured orders once.
          if (!positions.has(parent))
            positions.set(parent, new Map(rows.get(parent)?.children.map((child, index) => [child, index])))
          return positions.get(parent)!.get(id)
        },
      },
      () => {
        check()
        const ids = new Set(memory?.nodeIds())
        before().forEach((row, id) => (row ? ids.add(id) : ids.delete(id)))
        return ids
      },
      check,
    )
  }

  /** Publishes incoming memory changes; local transactions notify only after their persistence is queued. */
  const publish = (batch: MemoryChanges) => {
    // Reentrant commands are already projected when their queued native notifications arrive.
    if (publishedRevision !== undefined && batch.revision <= publishedRevision) return
    if (!ready || currentTransaction) return
    let active = true
    const before = new Map(batch.changes.map(change => [change.id, change.before]))
    const previous = previousView(
      () => before,
      () => {
        if (!active || memory?.revision !== batch.revision) throw new Error('The previous document read has expired')
      },
    )
    try {
      lexemes!.commit(batch)
      publishedRevision = batch.revision
      const old = currentView
      const next = project()
      if (next !== old) notify(previous)
    } catch (error) {
      reportFailure(error)
    } finally {
      active = false
    }
  }

  /** Runs a complete editor command atomically, with synchronous read-your-writes and asynchronous durability. */
  const transact = <T>(
    work: (transaction: ThoughtspaceTransaction) => T,
    onCommit?: (value: T, persisted: Promise<void>) => void,
  ): { value: T; persisted: Promise<void> } => {
    if (failure) throw failure
    if (!ready || !memory || !persistent || dropping) throw new Error('Memory TreeCRDT is not ready for editing')
    if (currentTransaction) throw new Error('Use the current document transaction to compose commands')
    const callbacks: (() => void)[] = []
    const operationIds: OperationId[] = []
    const client = memory
    const operationOffset = client.operationCount()
    const previous = currentView
    let active = true
    let prepared: MemoryChanges
    /** Shares one native transaction across composed commands and scoped history reads. */
    const run = (engine: MemoryTransaction) => {
      currentTransaction = engine
      const thoughtIds = new Set<ThoughtId>()
      const childrenChangedIds = new Set<ThoughtId>()
      let reset = false
      /** Unions observed history boundaries, including a later return to the transaction's initial rows. */
      const collectChanges = () => {
        const batch = engine.getChanges()
        reset ||= batch.reset
        batch.changes.forEach(change => {
          thoughtIds.add(change.id as ThoughtId)
          if (!_.isEqual(change.before?.children, change.after?.children))
            childrenChangedIds.add(change.id as ThoughtId)
        })
        return batch
      }
      /** Rejects invalid anchors before authoring an insert or move. */
      const checkPlacement = (id: string, parentId: string, afterId: string | null) => {
        if (!active) throw new Error('The document transaction has finished')
        if (afterId && (afterId === id || engine.getContent(afterId)?.parentId !== parentId)) {
          throw new Error('afterId must name another child of the destination parent')
        }
      }
      /** Shares full-payload writes between field edits and imported/restored rows. */
      const writePayload = (id: string, thought: Thought) => {
        const payload = thoughtPayload(thought)
        if (!_.isEqual(engine.getContent(id)?.payload, payload))
          operationIds.push(engine.local.payload(id, payload).meta.id)
      }
      const transaction: ThoughtspaceTransaction = {
        get operationOffset() {
          if (!active) throw new Error('The document transaction has finished')
          return operationOffset + operationIds.length
        },
        capturePrevious: () => {
          if (!active) throw new Error('The document transaction has finished')
          project()
          const boundary = new Map(collectChanges().changes.map(change => [change.id, change.after]))
          let batch: MemoryChanges | undefined
          let before = boundary
          return previousView(
            () => {
              const changes = engine.getChanges()
              if (batch !== changes) {
                batch = changes
                before = new Map([...batch.changes.map(change => [change.id, change.before] as const), ...boundary])
              }
              return before
            },
            () => {
              if (!active) throw new Error('The previous document read has expired')
            },
          )
        },
        get operationIds() {
          if (!active) throw new Error('The document transaction has finished')
          return operationIds.slice()
        },
        getChanges: () => {
          if (!active) throw new Error('The document transaction has finished')
          collectChanges()
          return {
            thoughtIds: [...thoughtIds],
            childrenChangedIds: [...childrenChangedIds],
            reset,
          }
        },
        revert: ids => {
          if (!active) throw new Error('The document transaction has finished')
          const reverted = engine.revert(ids).map(operation => operation.meta.id)
          operationIds.push(...reverted)
          project()
          return reverted
        },
        project: () => {
          if (!active) throw new Error('The document transaction has finished')
          return project()
        },
        afterPersist: callback => {
          if (!active) throw new Error('The document transaction has finished')
          callbacks.push(callback)
        },
        insert: (thought, afterId) => {
          checkPlacement(thought.id, thought.parentId, afterId)
          if (engine.getContent(thought.id)) throw new Error('Cannot insert an existing thought')
          operationIds.push(engine.local.insert(thought.parentId, thought.id, afterId, thoughtPayload(thought)).meta.id)
        },
        payload: (id, fields) => {
          if (!active) throw new Error('The document transaction has finished')
          const current = reader.getThought(id)
          if (!current) throw new Error('Cannot update a missing thought')
          if (Object.entries(fields).some(([key, value]) => current[key as keyof Thought] !== value)) {
            writePayload(id, { ...current, ...fields })
          }
        },
        move: (id, { parentId, afterId }) => {
          checkPlacement(id, parentId, afterId)
          operationIds.push(engine.local.move(id, parentId, afterId).meta.id)
        },
        delete: id => {
          if (!active) throw new Error('The document transaction has finished')
          if (engine.getContent(id)) operationIds.push(engine.local.delete(id).meta.id)
        },
        update: ({ thoughtIndexUpdates, movePlacements }) => {
          if (!active) throw new Error('The document transaction has finished')
          // Moves out of a deleted subtree must precede its delete; otherwise defensive deletion restores the parent.
          const edits = Object.entries(thoughtIndexUpdates).filter((entry): entry is [string, Thought] => !!entry[1])
          const deletes = Object.entries(thoughtIndexUpdates).filter(([, thought]) => !thought)
          // Batched imports can supply an unordered topology. Restore parents and placement anchors
          // before their dependents so every insert/move has a live destination.
          const pending = new Map<string, number>()
          const dependents = new Map<string, typeof edits>()
          const ordered: typeof edits = []
          for (const entry of edits) {
            const [id, thought] = entry
            let dependencies = 0
            for (const dependency of [thought.parentId, movePlacements?.[id]]) {
              if (!dependency || !thoughtIndexUpdates[dependency]) continue
              dependencies++
              const entries = dependents.get(dependency) ?? []
              entries.push(entry)
              dependents.set(dependency, entries)
            }
            pending.set(id, dependencies)
            if (!dependencies) ordered.push(entry)
          }
          // Iterate the growing queue without recursion or copying the ancestry of long sibling chains.
          for (const [id] of ordered) {
            for (const entry of dependents.get(id) ?? []) {
              const remaining = pending.get(entry[0])! - 1
              pending.set(entry[0], remaining)
              if (!remaining) ordered.push(entry)
            }
          }
          if (ordered.length !== edits.length) throw new Error('A command cannot create a parent or placement cycle')
          for (const [id, thought] of [...ordered, ...deletes.reverse()]) {
            if (!thought) {
              transaction.delete(id as ThoughtId)
              continue
            }
            const current = engine.getContent(id)
            const exists = !!current
            const hasPlacement = !!movePlacements && id in movePlacements
            if ((!exists || current.parentId !== thought.parentId) && !hasPlacement) {
              throw new Error('Inserts and parent changes require an explicit afterId placement')
            }
            const after = movePlacements?.[id] ?? null
            if (!exists) {
              transaction.insert(thought, after)
            } else {
              if (hasPlacement) transaction.move(id as ThoughtId, { parentId: thought.parentId, afterId: after })
              writePayload(id, thought)
            }
          }
          return project()
        },
      }
      const value = work(transaction)
      // A caught update error can leave earlier writes unprojected; refresh before committing them.
      project()
      prepared = engine.getChanges()
      lexemes!.prepare(prepared)
      return value
    }
    let result: { value: T; operations: Operation[]; changes: MemoryChanges }
    try {
      result = client.transact(run)
      lexemes!.commit(prepared!)
      // Net-no-change commands do not notify subscribers, but their final batch still supersedes intermediate reads.
      publishedRevision = result.changes.revision
    } catch (error) {
      viewRevision++
      currentView = previous
      projectionRevision = projection?.revision
      throw error
    } finally {
      active = false
      currentTransaction = undefined
    }
    const target = persistent
    commitTail = commitTail.then(async () => {
      if (!result.operations.length) return
      // Transport.send does not acknowledge durable storage. Append these exact operations explicitly.
      await target.ops.appendMany(result.operations, { writeId: localWriteId })
    })
    void commitTail.catch(reportFailure)
    const persisted = callbacks.length ? commitTail.then(() => callbacks.forEach(callback => callback())) : commitTail
    const changed = result.changes.reset || result.changes.changes.length > 0
    let notifying = true
    const beforeRows = new Map(result.changes.changes.map(change => [change.id, change.before]))
    const before = previousView(
      () => beforeRows,
      () => {
        if (!notifying || client.revision !== result.changes.revision)
          throw new Error('The previous document read has expired')
      },
    )
    // Queue persistence first: a subscriber may author another command, whose operations must follow this one.
    try {
      onCommit?.(result.value, persisted)
    } finally {
      try {
        if (changed) notify(before)
      } finally {
        notifying = false
      }
    }
    return { value: result.value, persisted }
  }

  /** Stops the replica and closes its client, deleting storage only for an explicit drop. */
  const releaseResources = async ({ deleteStorage }: { deleteStorage: boolean }) => {
    ready = false
    subscription?.stop()
    await Promise.allSettled([subscription?.done])
    subscription = undefined
    peers?.detach()
    unsubscribe?.()
    unsubscribeMemory?.()
    memory?.close()
    memory = undefined
    projection = undefined
    const target = persistent
    try {
      if (deleteStorage) await target?.drop()
      else await target?.close()
    } catch (error) {
      if (deleteStorage) await target?.close()
      throw error
    } finally {
      persistent = undefined
      peers = undefined
      unsubscribe = undefined
      lexemes = undefined
      projectionRevision = undefined
      viewRevision++
      currentView = view()
      publishedRevision = undefined
      initPromise = undefined
      commitTail = syncTail = Promise.resolve()
    }
  }

  /** Rejects new edits immediately and releases resources after all accepted work has settled. */
  const drop = () => {
    if (dropping) return dropping
    ready = false
    dropping = (async () => {
      // A previous write failure must not prevent explicit cleanup from closing the database.
      await Promise.allSettled([initPromise])
      await Promise.allSettled([drainWork()])
      await releaseResources({ deleteStorage: true })
      failure = undefined
      onError = undefined
    })().finally(() => {
      dropping = undefined
    })
    void dropping.catch(reportFailure)
    return dropping
  }

  return {
    transact,
    get operationOffset() {
      return memory?.operationCount() ?? 0
    },
    project: () => currentView,
    readHistory: (spans, visit) => {
      if (!ready || !memory || dropping) throw new Error('Memory TreeCRDT is not ready for historical reads')
      return memory.readHistory(spans, ({ before, after, changes }, index) => {
        let active = true
        /** Checks callback lifetime even when a historical sibling order is already cached. */
        const check = () => {
          if (!active) throw new Error('The historical document read has expired')
        }
        try {
          return visit(
            {
              before: memoryReader(before, before.nodeIds, check),
              after: memoryReader(after, after.nodeIds, check),
              thoughtIds: changes.map(change => change.id as ThoughtId),
              childrenChangedIds: changes
                .filter(change => !_.isEqual(change.before?.children, change.after?.children))
                .map(change => change.id as ThoughtId),
            },
            index,
          )
        } finally {
          active = false
        }
      })
    },
    subscribe: listener => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    get ready() {
      return ready
    },
    acquireAccess: async () => {
      const status = await acquireTreecrdtSessionLock()
      return status === 'acquired'
        ? { status: 'acquired' }
        : {
            status: 'blocked',
            reason: status === 'unavailable' ? 'already-open' : 'unsupported',
          }
    },
    init: function initialize(options: ThoughtspaceRuntimeInitOptions): Promise<{ clientId: string; storage: string }> {
      if (dropping) return dropping.then(() => initialize(options))
      onError = options.onError ?? onError
      if (initPromise) return initPromise
      failure = undefined
      initPromise = (async () => {
        const clientId = await clientIdReady
        await initPermissionsStore()
        persistent = await openClient({
          docId: tsid,
          persistent: options.storage === 'persistent',
          filename: `/treecrdt-em-memory-prototype-${tsid}.db`,
        })
        await initializeMemoryStorage(persistent, crypto.getRandomValues(new Uint8Array(32)))
        memory = await openMemory()
        unsubscribeMemory = memory.subscribe(publish)
        const storageBackend = createTreecrdtSyncBackendFromClient(persistent, tsid)
        /** Gates editing even when the protocol treats a failed subscription push as best-effort. */
        const failSync = (error: unknown): never => {
          reportFailure(error)
          throw error
        }
        peers = createInMemoryConnectedPeers({
          backendA: createMemorySyncBackend(memory, { docId: tsid }),
          backendB: {
            ...storageBackend,
            listOpRefs: filter => storageBackend.listOpRefs(filter).catch(failSync),
            getOpsByOpRefs: refs => storageBackend.getOpsByOpRefs(refs).catch(failSync),
          },
          codec: treecrdtSyncV0ProtobufCodec,
        })
        unsubscribe = persistent.onMaterialized(event => {
          // Memory already owns these operations. Provenance, not append timing, distinguishes delayed local
          // acknowledgements from incoming changes; mixed or unidentified events still notify the sync peer.
          if (
            event.changes.length &&
            event.changes.every(change => {
              const writeIds = change.source?.writeIds
              return !!writeIds?.length && writeIds.every(id => id === localWriteId)
            })
          )
            return
          syncTail = syncTail.then(() => peers!.peerB.notifyLocalUpdate())
          void syncTail.catch(reportFailure)
        })
        subscription = peers.peerA.subscribe(peers.transportA, { all: {} })
        void subscription.done.catch(reportFailure)
        await subscription.ready
        // The subscription's best-effort initial push may fail even when reconciliation resolves readiness.
        if (failure) throw failure
        ready = !dropping
        projection = memory.createProjection<Thought>({ decode: readThought })
        lexemes = createLexemeLookup(memory)
        project()
        publishedRevision = undefined
        return { clientId, storage: persistent.storage }
      })().catch(async error => {
        reportFailure(error)
        await releaseResources({ deleteStorage: false })
        throw error
      })
      return initPromise
    },
    drop,
    waitForIdle,
  }
}

export default createMemoryThoughtspace
