import type { Operation, OperationId } from '@treecrdt/interface'
import type { SyncSubscription } from '@treecrdt/sync-protocol'
import { createInMemoryConnectedPeers } from '@treecrdt/sync-protocol/in-memory'
import { treecrdtSyncV0ProtobufCodec } from '@treecrdt/sync-protocol/protobuf'
import { createTreecrdtSyncBackendFromClient } from '@treecrdt/sync-sqlite'
import { type TreecrdtClient, createTreecrdtClient } from '@treecrdt/wa-sqlite'
import { type MemoryChanges, type MemoryRow, type MemoryTransaction, createMemoryClient } from '@treecrdt/wasm/memory'
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
const readThought = (row: MemoryRow | undefined): Thought | undefined => {
  if (!row) return undefined
  const payload = row.payload
  return payload === null
    ? undefined
    : (Object.freeze({
        ...decodeThoughtPayload(payload),
        id: row.id as ThoughtId,
        parentId: (row.parentId ?? ROOT_PARENT_ID) as ThoughtId,
      }) as Thought)
}

/** Adapts current rows or a transaction-scoped before reader without copying the tree. */
const memoryView = (
  read: (id: string) => MemoryRow | undefined,
  nodeIds: () => Iterable<string>,
  lexemes: () => ThoughtspaceView['lexemeIndex'],
  getThought = (id: ThoughtId) => readThought(read(id)),
  revision: () => number = () => 0,
): ThoughtspaceView => {
  let version: number | undefined
  const orders = new Map<string, readonly string[]>()
  const children = new Map<string, readonly ThoughtId[]>()
  const positions = new Map<string, Map<string, number>>()
  /** Reuses requested sibling orders only until the live document changes. */
  const order = (id: string) => {
    const current = revision()
    if (version !== current) {
      version = current
      orders.clear()
      children.clear()
      positions.clear()
    }
    if (!orders.has(id)) orders.set(id, read(id)?.children ?? [])
    return orders.get(id)!
  }
  return {
    get revision() {
      return revision()
    },
    get lexemeIndex() {
      return lexemes()
    },
    getThought,
    getChildren: id => {
      const ids = order(id)
      if (!children.has(id))
        children.set(
          id,
          Object.freeze(
            getThought(id) ? ids.filter(child => !!getThought(child as ThoughtId)) : [],
          ) as readonly ThoughtId[],
        )
      return children.get(id)!
    },
    getPosition: id => {
      const parent = getThought(id)?.parentId ?? read(id)?.parentId
      if (!parent) return undefined
      const ids = order(parent)
      if (!positions.has(parent)) positions.set(parent, new Map(ids.map((child, index) => [child, index])))
      return positions.get(parent)!.get(id)
    },
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
  const listeners = new Set<(previous: ThoughtspaceView) => void>()
  let persistent: TreecrdtClient | undefined
  let memory: Awaited<ReturnType<typeof createMemoryClient>> | undefined
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
  let lexemeIndex: ThoughtspaceView['lexemeIndex'] = {}
  // Only decoded query results are cached. There is no row/child snapshot or per-edit copy of the tree.
  const thoughts = new Map<string, Thought | undefined>()
  /** Reads a current row; selectors may ask for a missing path's undefined endpoint. */
  const read = (id: string) => (id ? memory?.get(id) : undefined)
  /** Reuses immutable decoded query results until their content or parent changes. */
  const getThought = (id: ThoughtId) => {
    if (!thoughts.has(id)) thoughts.set(id, readThought(read(id)))
    return thoughts.get(id)
  }
  let viewRevision = 0
  /** Creates a publication identity, not a historical copy of the tree. */
  const view = (): ThoughtspaceView =>
    memoryView(
      read,
      () => memory?.nodeIds() ?? [],
      () => lexemeIndex,
      getThought,
      () => viewRevision,
    )
  let snapshot = view()
  let latestChanges: MemoryChanges | undefined
  let projectedChanges: MemoryChanges | undefined
  let editing = false
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
  const notify = (previous: ThoughtspaceView) => {
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

  /** Updates affected lexeme buckets from actual changes; ordinary reads stay in the native tree. */
  const project = (batch = latestChanges): ThoughtspaceView => {
    if (!memory || !ready) return snapshot
    if (!batch || batch === projectedChanges) return snapshot
    const prior = new Map(projectedChanges?.changes.map(change => [change.id, change.after]))
    const changes = new Map(batch.changes.map(change => [change.id, change]))
    const candidates = new Set([...prior.keys(), ...changes.keys()])
    const memberships = new Map<string, Set<string>>()
    /** Copies only the value buckets affected by changed payloads or visibility. */
    const members = (value: string) => {
      const key = hashThought(value)
      if (!memberships.has(key)) memberships.set(key, new Set(lexemeIndex[key]?.contexts))
      return memberships.get(key)!
    }
    let changed = false
    candidates.forEach(id => {
      const oldRow = (prior.has(id) ? prior.get(id) : changes.get(id)?.before) ?? undefined
      const row = read(id)
      if (_.isEqual(oldRow, row)) return
      changed = true
      const payloadChanged = !_.isEqual(oldRow?.payload, row?.payload)
      const old = payloadChanged ? readThought(oldRow) : undefined
      if (payloadChanged || oldRow?.parentId !== row?.parentId) thoughts.delete(id)
      if (payloadChanged && old && !ROOT_IDS.has(id)) members(old.value).delete(id)
      const thought = payloadChanged ? readThought(row) : undefined
      if (payloadChanged && thought && !ROOT_IDS.has(id)) members(thought.value).add(id)
    })
    const nextLexemes = memberships.size ? { ...lexemeIndex } : lexemeIndex
    memberships.forEach((ids, key) => {
      const thoughts = [...ids].sort().map(id => readThought(read(id))!)
      if (!thoughts.length) {
        delete nextLexemes[key]
        return
      }
      const earliest = thoughts.reduce((a, b) => (a.created <= b.created ? a : b))
      const latest = thoughts.reduce((a, b) => (a.lastUpdated >= b.lastUpdated ? a : b))
      const lexeme: Lexeme = {
        contexts: thoughts.map(thought => thought.id),
        created: earliest.created,
        lastUpdated: latest.lastUpdated,
        updatedBy: latest.updatedBy,
      }
      nextLexemes[key] = _.isEqual(lexemeIndex[key], lexeme) ? lexemeIndex[key] : lexeme
    })
    if ([...memberships.keys()].some(key => nextLexemes[key] !== lexemeIndex[key])) lexemeIndex = nextLexemes
    projectedChanges = batch
    if (changed) {
      viewRevision++
      snapshot = view()
    }
    return snapshot
  }

  /** Supplies old rows only for changed nodes, while unchanged rows are read from the current tree. */
  const previousView = (
    before: () => ReadonlyMap<string, MemoryRow | null>,
    previousLexemes: ThoughtspaceView['lexemeIndex'],
    check: () => void,
    revision = viewRevision,
  ) =>
    memoryView(
      id => {
        check()
        const rows = before()
        return rows.has(id) ? (rows.get(id) ?? undefined) : read(id)
      },
      () => {
        check()
        const ids = new Set(memory?.nodeIds())
        before().forEach((row, id) => (row ? ids.add(id) : ids.delete(id)))
        return ids
      },
      () => {
        check()
        return previousLexemes
      },
      undefined,
      () => {
        check()
        return revision
      },
    )

  /** Publishes incoming memory changes; local transactions notify only after their persistence is queued. */
  const publish = (batch: MemoryChanges) => {
    // Reentrant commands are already projected when their queued native notifications arrive.
    if (projectedChanges && batch.revision <= projectedChanges.revision) return
    latestChanges = batch
    if (!ready || editing) return
    let active = true
    const before = new Map(batch.changes.map(change => [change.id, change.before]))
    const previous = previousView(
      () => before,
      lexemeIndex,
      () => {
        if (!active || memory?.revision !== batch.revision) throw new Error('The previous document read has expired')
      },
    )
    try {
      projectedChanges = undefined
      const old = snapshot
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
    if (editing) throw new Error('Use the current document transaction to compose commands')
    const callbacks: (() => void)[] = []
    const operationIds: OperationId[] = []
    const client = memory
    const previous = project()
    const previousLexemes = lexemeIndex
    const previousChanges = latestChanges
    const previousProjected = projectedChanges
    projectedChanges = undefined
    let active = true
    /** Projects each composed step against its explicit, non-consuming transaction change batch. */
    const run = (engine: MemoryTransaction) => {
      const thoughtIds = new Set<ThoughtId>()
      const childrenChangedIds = new Set<ThoughtId>()
      /** Retains conservative invalidations even when later steps restore the transaction's initial rows. */
      const projectCurrent = () => {
        const batch = engine.getChanges()
        batch.changes.forEach(change => {
          thoughtIds.add(change.id as ThoughtId)
          if (!_.isEqual(change.before?.children, change.after?.children))
            childrenChangedIds.add(change.id as ThoughtId)
        })
        return project(batch)
      }
      const transaction: ThoughtspaceTransaction = {
        capturePrevious: () => {
          if (!active) throw new Error('The document transaction has finished')
          projectCurrent()
          const boundary = new Map(projectedChanges?.changes.map(change => [change.id, change.after]))
          let batch: MemoryChanges | undefined
          let before = boundary
          return previousView(
            () => {
              if (batch !== projectedChanges) {
                batch = projectedChanges
                before = new Map([
                  ...(batch?.changes.map(change => [change.id, change.before] as const) ?? []),
                  ...boundary,
                ])
              }
              return before
            },
            lexemeIndex,
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
          projectCurrent()
          return {
            thoughtIds: [...thoughtIds],
            childrenChangedIds: [...childrenChangedIds],
            reset: projectedChanges?.reset ?? false,
          }
        },
        revert: ids => {
          if (!active) throw new Error('The document transaction has finished')
          const reverted = engine.revert(ids).map(operation => operation.meta.id)
          operationIds.push(...reverted)
          projectCurrent()
          return reverted
        },
        project: () => {
          if (!active) throw new Error('The document transaction has finished')
          return projectCurrent()
        },
        afterPersist: callback => {
          if (!active) throw new Error('The document transaction has finished')
          callbacks.push(callback)
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
              if (engine.get(id)) operationIds.push(engine.local.delete(id).meta.id)
              continue
            }
            const current = engine.get(id)
            const exists = !!current
            const hasPlacement = !!movePlacements && id in movePlacements
            if ((!exists || current.parentId !== thought.parentId) && !hasPlacement) {
              throw new Error('Inserts and parent changes require an explicit afterId placement')
            }
            const after = movePlacements?.[id]
            if (hasPlacement && after && (after === id || engine.get(after)?.parentId !== thought.parentId)) {
              throw new Error('afterId must name another child of the destination parent')
            }
            const payload = thoughtPayload(thought)
            if (!exists) {
              operationIds.push(engine.local.insert(thought.parentId, id, after, payload).meta.id)
            } else {
              if (hasPlacement) {
                operationIds.push(engine.local.move(id, thought.parentId, after).meta.id)
              }
              if (!_.isEqual(current.payload, payload)) operationIds.push(engine.local.payload(id, payload).meta.id)
            }
          }
          return projectCurrent()
        },
      }
      const value = work(transaction)
      // A command can finish with a revert after its last explicit read. Project before commit so errors still roll back.
      projectCurrent()
      return value
    }
    let result: { value: T; operations: Operation[]; changes: MemoryChanges }
    editing = true
    try {
      result = client.transact(run)
      // Net-no-change commands do not notify subscribers, but their final batch still supersedes intermediate reads.
      latestChanges = projectedChanges = result.changes
    } catch (error) {
      viewRevision++
      snapshot = previous
      lexemeIndex = previousLexemes
      thoughts.clear()
      projectedChanges = previousProjected
      latestChanges = previousChanges
      throw error
    } finally {
      active = false
      editing = false
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
      previousLexemes,
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
      lexemeIndex = {}
      thoughts.clear()
      viewRevision++
      snapshot = view()
      projectedChanges = undefined
      latestChanges = undefined
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
    project: () => project(),
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
        // Hydration may arrive in several batches before publication. Derive memberships once from the ready tree.
        latestChanges = {
          revision: memory.revision,
          reset: true,
          changes: memory.nodeIds().map(id => ({ id, before: null, after: memory!.get(id)! })),
        }
        project()
        latestChanges = projectedChanges = undefined
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
