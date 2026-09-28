import type { Operation, OperationId } from '@treecrdt/interface'
import type { SyncSubscription } from '@treecrdt/sync-protocol'
import { createInMemoryConnectedPeers } from '@treecrdt/sync-protocol/in-memory'
import { treecrdtSyncV0ProtobufCodec } from '@treecrdt/sync-protocol/protobuf'
import { createTreecrdtSyncBackendFromClient } from '@treecrdt/sync-sqlite'
import { type TreecrdtClient, createTreecrdtClient } from '@treecrdt/wa-sqlite'
import {
  type MemorySnapshot,
  type MemorySnapshotChanges,
  type MemorySnapshotRow,
  type MemoryTransaction,
  createMemoryClient,
} from '@treecrdt/wasm'
import { createMemorySyncBackend } from '@treecrdt/wasm/sync'
import _ from 'lodash'
import type Lexeme from '../../@types/Lexeme'
import type Thought from '../../@types/Thought'
import type ThoughtId from '../../@types/ThoughtId'
import type ThoughtspaceTransaction from '../../@types/ThoughtspaceTransaction'
import type ThoughtspaceView from '../../@types/ThoughtspaceView'
import { GLOBAL_ROOT_TOKEN, ROOT_PARENT_ID } from '../../constants'
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
const decoded = new WeakMap<MemorySnapshotRow, Thought | null>()
const positions = new WeakMap<readonly string[], Map<string, number>>()

/** Decodes content once per immutable row; structural indexes remain in the native snapshot. */
const readThought = (row: MemorySnapshotRow | undefined): Thought | undefined => {
  if (!row) return undefined
  const cached = decoded.get(row)
  if (cached !== undefined) return cached ?? undefined
  const payload = row.payload
  const thought =
    payload === null
      ? null
      : (Object.freeze({
          ...decodeThoughtPayload(payload),
          id: row.id as ThoughtId,
          parentId: (row.parentId ?? ROOT_PARENT_ID) as ThoughtId,
        }) as Thought)
  decoded.set(row, thought)
  return thought ?? undefined
}

/** Captures structural reads against one immutable tree, with lazy decoding and positional caches. */
const memoryView = (rows: MemorySnapshot, lexemeIndex: ThoughtspaceView['lexemeIndex'] = {}): ThoughtspaceView => {
  const children = new Map<string, readonly ThoughtId[]>()
  return {
    lexemeIndex,
    getThought: id => readThought(rows.get(id)),
    getChildren: id => {
      let ids = children.get(id)
      if (!ids) {
        const row = rows.get(id)
        const order = readThought(row) ? row!.children : Object.freeze([])
        // Reuse native immutable order unless payload-less children must be hidden in this snapshot.
        ids = (
          order.every(child => !!readThought(rows.get(child)))
            ? order
            : Object.freeze(order.filter(child => !!readThought(rows.get(child))))
        ) as readonly ThoughtId[]
        children.set(id, ids)
      }
      return ids
    },
    getPosition: id => {
      const parent = rows.get(id)?.parentId
      const order = parent ? rows.get(parent)?.children : undefined
      if (!order) return undefined
      let index = positions.get(order)
      if (!index) {
        index = new Map(order.map((child, i) => [child, i]))
        positions.set(order, index)
      }
      return index.get(id)
    },
    *values() {
      for (const row of rows.values()) {
        const thought = readThought(row)
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
  let persistent: TreecrdtClient | undefined
  let memory: Awaited<ReturnType<typeof createMemoryClient>> | undefined
  let peers: ReturnType<typeof createInMemoryConnectedPeers<Operation>> | undefined
  let onChange: ThoughtspaceRuntimeInitOptions['onChange']
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
  let snapshot = memoryView(new Map())
  let projectedRows: MemorySnapshot | undefined
  let latestChanges: MemorySnapshotChanges | undefined
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

  /** Updates derived lexemes and captures canonical rows. */
  const project = (batch = latestChanges): ThoughtspaceView => {
    if (!memory || !ready) return snapshot
    const rows = batch?.snapshot ?? memory.getSnapshot()
    if (rows === projectedRows) return snapshot
    const reset = !projectedRows || !!batch?.reset
    const changes = new Map(batch?.changes.map(change => [change.id, change]))
    const changed = new Set<string>()
    const candidates = reset ? new Set([...rows.keys(), ...(projectedRows?.keys() ?? [])]) : changes.keys()
    Array.from(candidates).forEach(id => {
      if (rows.get(id) !== projectedRows?.get(id)) changed.add(id)
    })
    const lexemeIndex = { ...snapshot.lexemeIndex }
    const memberships = new Map<string, Set<string>>()
    /** Copies only the value buckets affected by changed payloads or visibility. */
    const members = (value: string) => {
      const key = hashThought(value)
      if (!memberships.has(key)) memberships.set(key, new Set(snapshot.lexemeIndex[key]?.contexts))
      return memberships.get(key)!
    }
    changed.forEach(id => {
      const old = readThought(projectedRows?.get(id))
      const row = rows.get(id)
      const oldRow = projectedRows?.get(id)
      // Flags are cumulative within a transaction; a later projection may already contain that payload change.
      const payloadChanged =
        !old || !row || ((reset || changes.get(id)?.payloadChanged) && !_.isEqual(oldRow?.payload, row.payload))
      // Seed structural-only rows without replacing the decode of a restored checkpoint row.
      if (row && old && !payloadChanged && !decoded.has(row)) {
        decoded.set(
          row,
          oldRow?.parentId === row.parentId
            ? old
            : Object.freeze({ ...old, parentId: (row.parentId ?? ROOT_PARENT_ID) as ThoughtId }),
        )
      }
      if (payloadChanged && old && !ROOT_IDS.has(id)) members(old.value).delete(id)
      const thought = readThought(row)
      if (payloadChanged && thought && !ROOT_IDS.has(id)) members(thought.value).add(id)
    })
    memberships.forEach((ids, key) => {
      const thoughts = [...ids].sort().map(id => readThought(rows.get(id))!)
      if (!thoughts.length) {
        delete lexemeIndex[key]
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
      lexemeIndex[key] = _.isEqual(snapshot.lexemeIndex[key], lexeme) ? snapshot.lexemeIndex[key] : lexeme
    })
    snapshot = memoryView(
      rows,
      [...memberships.keys()].some(key => lexemeIndex[key] !== snapshot.lexemeIndex[key])
        ? lexemeIndex
        : snapshot.lexemeIndex,
    )
    projectedRows = rows
    return snapshot
  }

  /** Publishes changed memory state; local commands publish synchronously through their caller. */
  const publish = (batch: MemorySnapshotChanges) => {
    latestChanges = batch
    if (!ready || editing) return
    try {
      const previous = snapshot
      const next = project()
      if (next !== previous) onChange?.(next)
    } catch (error) {
      reportFailure(error)
    }
  }

  /** Runs a complete editor command atomically, with synchronous read-your-writes and asynchronous durability. */
  const transact = <T>(work: (transaction: ThoughtspaceTransaction) => T): { value: T; persisted: Promise<void> } => {
    if (failure) throw failure
    if (!ready || !memory || !persistent || dropping) throw new Error('Memory TreeCRDT is not ready for editing')
    if (editing) throw new Error('Use the current document transaction to compose commands')
    const callbacks: (() => void)[] = []
    const operationIds: OperationId[] = []
    const client = memory
    const previous = snapshot
    const previousRows = projectedRows
    const previousChanges = latestChanges
    let active = true
    /** Projects each composed step against its explicit, non-consuming transaction change batch. */
    const run = (engine: MemoryTransaction) => {
      const transaction: ThoughtspaceTransaction = {
        get operationIds() {
          if (!active) throw new Error('The document transaction has finished')
          return operationIds.slice()
        },
        revert: ids => {
          if (!active) throw new Error('The document transaction has finished')
          const reverted = engine.revert(ids).map(operation => operation.meta.id)
          operationIds.push(...reverted)
          return reverted
        },
        project: () => {
          if (!active) throw new Error('The document transaction has finished')
          return project(engine.getChanges())
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
              if (engine.tree.exists(id)) operationIds.push(engine.local.delete(id).meta.id)
              continue
            }
            const exists = engine.tree.exists(id)
            const hasPlacement = !!movePlacements && id in movePlacements
            if ((!exists || engine.tree.parent(id) !== thought.parentId) && !hasPlacement) {
              throw new Error('Inserts and parent changes require an explicit afterId placement')
            }
            const after = movePlacements?.[id] ?? undefined
            if (hasPlacement && after && (after === id || engine.tree.parent(after) !== thought.parentId)) {
              throw new Error('afterId must name another child of the destination parent')
            }
            const payload = thoughtPayload(thought)
            if (!exists) {
              operationIds.push(engine.local.insert(thought.parentId, id, after, payload).meta.id)
            } else {
              if (hasPlacement) {
                operationIds.push(engine.local.move(id, thought.parentId, after).meta.id)
              }
              if (!_.isEqual(engine.tree.payload(id), payload))
                operationIds.push(engine.local.payload(id, payload).meta.id)
            }
          }
          return project(engine.getChanges())
        },
      }
      const value = work(transaction)
      // A command can finish with a revert after its last explicit read. Project before commit so errors still roll back.
      project(engine.getChanges())
      return value
    }
    let result: { value: T; operations: Operation[]; changes: MemorySnapshotChanges }
    editing = true
    try {
      result = client.transact(run)
      // Net-no-change commands do not notify subscribers, but their final batch still supersedes intermediate reads.
      latestChanges = result.changes
    } catch (error) {
      snapshot = previous
      projectedRows = previousRows
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
      await target.ops.appendMany(result.operations)
    })
    void commitTail.catch(reportFailure)
    const persisted = callbacks.length ? commitTail.then(() => callbacks.forEach(callback => callback())) : commitTail
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
      onChange = undefined
      snapshot = memoryView(new Map())
      projectedRows = undefined
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
      onChange = options.onChange ?? onChange
      onError = options.onError ?? onError
      if (initPromise) return initPromise
      failure = undefined
      initPromise = (async () => {
        const clientId = await clientIdReady
        await initPermissionsStore()
        persistent = await openClient({
          docId: tsid,
          storage:
            options.storage === 'memory'
              ? { type: 'memory' }
              : { type: 'opfs', filename: `/treecrdt-em-memory-prototype-${tsid}.db`, fallback: 'throw' },
          runtime: { type: options.storage === 'memory' ? 'direct' : 'dedicated-worker' },
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
        unsubscribe = persistent.onMaterialized(() => {
          syncTail = syncTail.then(() => peers!.peerB.notifyLocalUpdate())
          void syncTail.catch(reportFailure)
        })
        subscription = peers.peerA.subscribe(peers.transportA, { all: {} })
        void subscription.done.catch(reportFailure)
        await subscription.ready
        ready = !dropping
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
