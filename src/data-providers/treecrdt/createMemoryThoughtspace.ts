import type { Operation } from '@treecrdt/interface'
import type { SyncSubscription } from '@treecrdt/sync-protocol'
import { createInMemoryConnectedPeers } from '@treecrdt/sync-protocol/in-memory'
import { treecrdtSyncV0ProtobufCodec } from '@treecrdt/sync-protocol/protobuf'
import { createTreecrdtSyncBackendFromClient } from '@treecrdt/sync-sqlite'
import { type TreecrdtClient, createTreecrdtClient } from '@treecrdt/wa-sqlite'
import { type TreeSnapshotRow, createMemoryClient } from '@treecrdt/wasm'
import { createMemorySyncBackend } from '@treecrdt/wasm/sync'
import _ from 'lodash'
import type Lexeme from '../../@types/Lexeme'
import type Thought from '../../@types/Thought'
import type ThoughtIndices from '../../@types/ThoughtIndices'
import type ThoughtspaceTransaction from '../../@types/ThoughtspaceTransaction'
import { GLOBAL_ROOT_TOKEN, ROOT_PARENT_ID } from '../../constants'
import { childrenMapKey } from '../../util/createChildrenMap'
import hashThought from '../../util/hashThought'
import isAttribute from '../../util/isAttribute'
import { initPermissionsStore } from '../permissionsStore'
import type { ThoughtspaceRuntimeInitOptions } from '../thoughtspace'
import { clientIdReady, tsid } from '../thoughtspaceSession'
import initializeMemoryStorage from './initializeMemoryStorage'
import { decodeThoughtPayload, encodeThoughtPayload } from './payload'
import acquireTreecrdtSessionLock from './sessionLock'
import { SYSTEM_ROOT_THOUGHT_IDS } from './systemThoughtIds'

const ROOT_IDS = new Set<string>([GLOBAL_ROOT_TOKEN, ...SYSTEM_ROOT_THOUGHT_IDS])

/** Excludes transient editor fields and derived structure from the document payload. */
const thoughtPayload = ({ value, created, lastUpdated, updatedBy, archived }: Thought) =>
  encodeThoughtPayload({ value, created, lastUpdated, updatedBy, ...(archived !== undefined && { archived }) })

/** Owns the complete synchronous document and persists its exact operations to SQLite. */
const createMemoryThoughtspace = (
  openClient: typeof createTreecrdtClient = createTreecrdtClient,
  openMemory: typeof createMemoryClient = createMemoryClient,
) => {
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
  let snapshot: ThoughtIndices = { thoughtIndex: {}, lexemeIndex: {} }
  let projectedRows: ReadonlyMap<string, TreeSnapshotRow> = new Map()
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

  /** Applies changed canonical rows to EM's indices, preserving only explicit transient editor fields. */
  const project = (view: ThoughtIndices = snapshot): ThoughtIndices => {
    if (!memory || !ready) return view
    const rows = memory.getSnapshot()
    if (view === snapshot && rows === projectedRows) return snapshot
    const changed = new Set<string>()
    if (rows !== projectedRows) {
      rows.forEach((row, id) => {
        if (row !== projectedRows.get(id)) changed.add(id)
      })
      projectedRows.forEach((_, id) => {
        if (!rows.has(id)) changed.add(id)
      })
    }
    // Transient generation/split fields can change without authoring a document operation.
    if (view !== snapshot) {
      Object.entries(snapshot.thoughtIndex).forEach(([id, thought]) => {
        if (view.thoughtIndex[id] !== thought) changed.add(id)
      })
    }
    const thoughtIndex = { ...snapshot.thoughtIndex }
    const lexemeIndex = { ...snapshot.lexemeIndex }
    const parents = new Set<string>()
    const memberships = new Map<string, Set<string>>()
    /** Copies only the value buckets affected by changed payloads or visibility. */
    const members = (value: string) => {
      const key = hashThought(value)
      if (!memberships.has(key)) memberships.set(key, new Set(snapshot.lexemeIndex[key]?.contexts))
      return memberships.get(key)!
    }
    changed.forEach(id => {
      const old = snapshot.thoughtIndex[id]
      const row = rows.get(id)
      const oldRow = projectedRows.get(id)
      const payloadChanged = !old || !row || !_.isEqual(oldRow?.payload, row.payload)
      if (payloadChanged && old && !ROOT_IDS.has(id)) members(old.value).delete(id)
      if (row && !_.isEqual(oldRow?.children, row.children)) parents.add(id)
      if (!row || row.payload === null) {
        delete thoughtIndex[id]
        if (old) parents.add(old.parentId)
        return
      }
      const previous = view.thoughtIndex[id]
      const {
        generating: _generating,
        displayValue: _displayValue,
        splitSource: _splitSource,
        ...canonical
      } = old ?? {}
      const thought = {
        ...(payloadChanged ? decodeThoughtPayload(row.payload) : canonical),
        id,
        parentId: row.parentId ?? ROOT_PARENT_ID,
        rank: old?.rank ?? 0,
        childrenMap: old?.childrenMap ?? {},
        ...(previous?.generating !== undefined && { generating: previous.generating }),
        ...(previous?.generating && previous.displayValue !== undefined && { displayValue: previous.displayValue }),
        ...(previous?.splitSource !== undefined && { splitSource: previous.splitSource }),
      } as Thought
      thoughtIndex[id] = thought
      if (payloadChanged && !ROOT_IDS.has(id)) members(thought.value).add(id)
      // Attribute renames can change lookup keys (including which duplicate owns the value key), but ordinary
      // values are always keyed by ID. Text/metadata edits therefore do not require walking the parent's siblings.
      const attributeKeyChanged =
        old?.value !== thought.value && (isAttribute(old?.value ?? '') || isAttribute(thought.value))
      if (attributeKeyChanged || old?.parentId !== thought.parentId) {
        if (old) parents.add(old.parentId)
        parents.add(thought.parentId)
      }
    })
    parents.forEach(parentId => {
      const parent = thoughtIndex[parentId]
      const row = rows.get(parentId)
      if (!row) return
      const childrenMap: Thought['childrenMap'] = {}
      row.children.forEach((id, rank) => {
        const child = thoughtIndex[id]
        if (!child) return
        childrenMap[childrenMapKey(childrenMap, child)] = child.id
        if (child.rank !== rank) {
          thoughtIndex[id] = { ...child, rank }
          changed.add(id)
        }
      })
      if (parent) {
        thoughtIndex[parentId] = { ...parent, childrenMap }
        changed.add(parentId)
      }
    })
    // Reuse untouched records and preserve childrenMap enumeration order for ranked traversal.
    changed.forEach(id => {
      const old = snapshot.thoughtIndex[id]
      const next = thoughtIndex[id]
      if (
        old &&
        next &&
        _.isEqual(old, next) &&
        _.isEqual(Object.keys(old.childrenMap), Object.keys(next.childrenMap))
      ) {
        thoughtIndex[id] = old
      }
    })
    memberships.forEach((ids, key) => {
      const thoughts = [...ids].sort().map(id => thoughtIndex[id])
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
    const next = {
      thoughtIndex: [...changed].some(id => thoughtIndex[id] !== snapshot.thoughtIndex[id])
        ? thoughtIndex
        : snapshot.thoughtIndex,
      lexemeIndex: [...memberships.keys()].some(key => lexemeIndex[key] !== snapshot.lexemeIndex[key])
        ? lexemeIndex
        : snapshot.lexemeIndex,
    }
    snapshot =
      next.thoughtIndex === snapshot.thoughtIndex && next.lexemeIndex === snapshot.lexemeIndex ? snapshot : next
    projectedRows = rows
    return snapshot
  }

  /** Publishes changed memory state; local commands publish synchronously through their caller. */
  const publish = () => {
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
  const transact = <T>(work: (document: ThoughtspaceTransaction) => T): { value: T; persisted: Promise<void> } => {
    if (failure) throw failure
    if (!ready || !memory || !persistent || dropping) throw new Error('Memory TreeCRDT is not ready for editing')
    if (editing) throw new Error('Use the current document transaction to compose commands')
    const callbacks: (() => void)[] = []
    const engine = memory
    const previous = snapshot
    const previousRows = projectedRows
    let active = true
    const document: ThoughtspaceTransaction = {
      project: view => {
        if (!active) throw new Error('The document transaction has finished')
        return project(view)
      },
      afterPersist: callback => {
        if (!active) throw new Error('The document transaction has finished')
        callbacks.push(callback)
      },
      update: ({ thoughtIndexUpdates, movePlacements }, view = snapshot) => {
        if (!active) throw new Error('The document transaction has finished')
        // Moves out of a deleted subtree must precede its delete; otherwise defensive deletion restores the parent.
        const edits = Object.entries(thoughtIndexUpdates).filter((entry): entry is [string, Thought] => !!entry[1])
        const deletes = Object.entries(thoughtIndexUpdates).filter(([, thought]) => !thought)
        // Undo supplies a final topology rather than an operation sequence. Restore parents and placement anchors
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
            if (engine.tree.exists(id)) engine.local.delete(id)
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
            engine.local.insert(thought.parentId, id, after, payload)
          } else {
            if (hasPlacement) {
              engine.local.move(id, thought.parentId, after)
            }
            if (!_.isEqual(engine.tree.payload(id), payload)) engine.local.payload(id, payload)
          }
        }
        return project({ ...view, thoughtIndex: { ...view.thoughtIndex, ...Object.fromEntries(edits) } })
      },
    }
    let result: { value: T; operations: Operation[] }
    editing = true
    try {
      result = engine.transact(() => work(document))
    } catch (error) {
      snapshot = previous
      projectedRows = previousRows
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
      snapshot = { thoughtIndex: {}, lexemeIndex: {} }
      projectedRows = new Map()
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
    project,
    get ready() {
      return ready
    },
    acquireAccess: async () => {
      const status = await acquireTreecrdtSessionLock()
      return status === 'acquired'
        ? { status: 'acquired' as const }
        : {
            status: 'blocked' as const,
            reason: status === 'unavailable' ? ('already-open' as const) : ('unsupported' as const),
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
