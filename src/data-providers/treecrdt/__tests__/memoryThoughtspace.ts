import { createTreecrdtClient } from '@treecrdt/wa-sqlite'
import { createMemoryClient } from '@treecrdt/wasm'
import type Thought from '../../../@types/Thought'
import type ThoughtId from '../../../@types/ThoughtId'
import type ThoughtspaceView from '../../../@types/ThoughtspaceView'
import type Timestamp from '../../../@types/Timestamp'
import { HOME_TOKEN } from '../../../constants'
import hashThought from '../../../util/hashThought'
import { tsid } from '../../thoughtspaceSession'
import createMemoryThoughtspace from '../createMemoryThoughtspace'
import initializeMemoryStorage from '../initializeMemoryStorage'
import { decodeThoughtPayload, encodeThoughtPayload } from '../payload'
import * as thoughtPayload from '../payload'

it('avoids scanning history for its own writes without suppressing incoming changes during a pending append', async () => {
  const persistent = await createTreecrdtClient({ docId: tsid, storage: { type: 'memory' } })
  const runtime = createMemoryThoughtspace(async () => persistent)
  const subscribed = vi.fn()
  const unsubscribe = runtime.subscribe(subscribed)
  const own: Thought = {
    id: '1'.repeat(32) as ThoughtId,
    parentId: HOME_TOKEN,
    value: 'local',
    created: 1 as Timestamp,
    lastUpdated: 1 as Timestamp,
    updatedBy: 'local',
  }
  const incoming = '2'.repeat(32) as ThoughtId
  let release!: () => void
  const gate = new Promise<void>(resolve => {
    release = resolve
  })
  let started!: () => void
  const appendStarted = new Promise<void>(resolve => {
    started = resolve
  })
  try {
    await runtime.init({ storage: 'memory' })
    await runtime.waitForIdle()
    const scans = vi.spyOn(persistent.opRefs, 'all')
    const committed = runtime.transact(transaction =>
      transaction.update({ thoughtIndexUpdates: { [own.id]: own }, movePlacements: { [own.id]: null } }),
    )
    expect(subscribed).toHaveBeenCalledExactlyOnceWith()
    subscribed.mockClear()
    await committed.persisted
    await runtime.waitForIdle()
    expect(scans).not.toHaveBeenCalled()
    expect(subscribed).not.toHaveBeenCalled()

    const append = persistent.ops.appendMany.bind(persistent.ops)
    vi.spyOn(persistent.ops, 'appendMany').mockImplementationOnce(async (ops, options) => {
      started()
      await gate
      return append(ops, options)
    })
    const pending = runtime.transact(transaction =>
      transaction.update({ thoughtIndexUpdates: { [own.id]: { ...own, value: 'pending local edit' } } }),
    )
    expect(subscribed).toHaveBeenCalledExactlyOnceWith()
    subscribed.mockClear()
    await appendStarted
    const received = new Promise<ThoughtspaceView>(resolve =>
      subscribed.mockImplementationOnce(() => resolve(runtime.project())),
    )
    await persistent.local.insert(
      new Uint8Array(32).fill(9),
      HOME_TOKEN,
      incoming,
      { type: 'last' },
      encodeThoughtPayload({ value: 'incoming', created: 1, lastUpdated: 1, updatedBy: 'remote' }),
      { writeId: 'another-provider' },
    )
    const view = await received
    expect(view.getThought(incoming)?.value).toBe('incoming')
    expect(view.getThought(own.id)?.value).toBe('pending local edit')

    release()
    await pending.persisted
    await runtime.waitForIdle()
    expect(scans).toHaveBeenCalledTimes(1)
    expect(subscribed).toHaveBeenCalledExactlyOnceWith()
    expect(runtime.project()).toBe(view)
    expect(decodeThoughtPayload((await persistent.tree.getPayload(own.id))!).value).toBe('pending local edit')
  } finally {
    release()
    unsubscribe()
    await runtime.drop()
  }
})

it.each(['foreign', 'mixed', 'mixed changes', 'missing', 'empty'] as const)(
  'synchronizes a materialization event with %s write provenance',
  async provenance => {
    const persistent = await createTreecrdtClient({ docId: tsid, storage: { type: 'memory' } })
    const foreign = await createMemoryClient()
    const subscribe = persistent.onMaterialized.bind(persistent)
    let incoming = false
    let ownWriteId: string | undefined
    // The dependency may coalesce changes with multiple owners or omit provenance during recovery.
    vi.spyOn(persistent, 'onMaterialized').mockImplementation(listener =>
      subscribe(event =>
        listener(
          incoming
            ? {
                ...event,
                changes: event.changes.map((change, index) => ({
                  ...change,
                  source: {
                    ...change.source,
                    writeIds:
                      provenance === 'foreign'
                        ? ['another-provider']
                        : provenance === 'mixed'
                          ? [ownWriteId!, 'another-provider']
                          : provenance === 'mixed changes'
                            ? [index === 0 ? ownWriteId! : 'another-provider']
                            : provenance === 'empty'
                              ? []
                              : undefined,
                  },
                })),
              }
            : event,
        ),
      ),
    )
    const runtime = createMemoryThoughtspace(async () => persistent)
    const own: Thought = {
      id: '3'.repeat(32) as ThoughtId,
      parentId: HOME_TOKEN,
      value: 'local',
      created: 1 as Timestamp,
      lastUpdated: 1 as Timestamp,
      updatedBy: 'local',
    }
    const remote = '4'.repeat(32) as ThoughtId
    const remoteSibling = '5'.repeat(32) as ThoughtId
    try {
      await runtime.init({ storage: 'memory' })
      const append = persistent.ops.appendMany.bind(persistent.ops)
      vi.spyOn(persistent.ops, 'appendMany').mockImplementationOnce((ops, options) => {
        ownWriteId = options?.writeId
        return append(ops, options)
      })
      await runtime.transact(transaction =>
        transaction.update({ thoughtIndexUpdates: { [own.id]: own }, movePlacements: { [own.id]: null } }),
      ).persisted
      await runtime.waitForIdle()
      expect(ownWriteId).toEqual(expect.any(String))
      foreign.appendOperations(await persistent.ops.all())
      const { operations } = foreign.transact(transaction => {
        transaction.local.insert(
          HOME_TOKEN,
          remote,
          own.id,
          encodeThoughtPayload({ value: 'remote', created: 1, lastUpdated: 1, updatedBy: 'remote' }),
        )
        transaction.local.insert(
          HOME_TOKEN,
          remoteSibling,
          remote,
          encodeThoughtPayload({ value: 'remote sibling', created: 1, lastUpdated: 1, updatedBy: 'remote' }),
        )
      })
      incoming = true
      await persistent.ops.appendMany(operations)
      await runtime.waitForIdle()
      expect(runtime.project().getThought(remote)?.value).toBe('remote')
      expect(runtime.project().getThought(remoteSibling)?.value).toBe('remote sibling')
      expect(runtime.project().getThought(own.id)?.value).toBe('local')
    } finally {
      foreign.close()
      await runtime.drop()
    }
  },
)

it('publishes incoming edits and order, and keeps a newer memory edit while an older write is awaiting storage', async () => {
  const persistent = await createTreecrdtClient({ docId: tsid, storage: { type: 'memory' } })
  const runtime = createMemoryThoughtspace(async () => persistent)
  let view: ThoughtspaceView = runtime.project()
  const unsubscribe = runtime.subscribe(() => {
    view = runtime.project()
  })
  const payload = { value: 'a', created: 1 as Timestamp, lastUpdated: 1 as Timestamp, updatedBy: 'test' }
  const a: Thought = { ...payload, id: '1'.repeat(32) as ThoughtId, parentId: HOME_TOKEN }
  const b: Thought = { ...a, id: '2'.repeat(32) as ThoughtId, value: 'b' }
  let release!: () => void
  const gate = new Promise<void>(resolve => {
    release = resolve
  })
  try {
    await runtime.init({ storage: 'memory' })
    const initial = runtime.transact(transaction =>
      transaction.update({
        thoughtIndexUpdates: { [a.id]: a, [b.id]: b },
        movePlacements: { [a.id]: null, [b.id]: a.id },
      }),
    )
    await initial.persisted
    await runtime.waitForIdle()

    const remoteReplica = new Uint8Array(32).fill(9)
    await persistent.local.payload(remoteReplica, a.id, encodeThoughtPayload({ ...payload, value: "O'Reilly ?1 $&" }))
    await persistent.local.move(remoteReplica, b.id, HOME_TOKEN, { type: 'first' })
    await runtime.waitForIdle()
    expect(view.getThought(a.id)!).toMatchObject({ value: "O'Reilly ?1 $&" })
    expect(view.getPosition(a.id)).toBe(1)
    expect(view.getPosition(b.id)).toBe(0)
    expect(view.lexemeIndex[hashThought("O'Reilly ?1 $&")].contexts).toEqual([a.id])
    runtime.project()

    const append = persistent.ops.appendMany.bind(persistent.ops)
    vi.spyOn(persistent.ops, 'appendMany').mockImplementationOnce(async ops => {
      await gate
      return append(ops)
    })
    const first = runtime.transact(transaction =>
      transaction.update({
        thoughtIndexUpdates: { [a.id]: { ...a, value: 'first' } },
      }),
    )
    const second = runtime.transact(transaction =>
      transaction.update({
        thoughtIndexUpdates: { [a.id]: { ...a, value: 'second' } },
      }),
    )
    expect(view.getThought(a.id)!.value).toBe('second')
    expect(view.lexemeIndex[hashThought('second')].contexts).toEqual([a.id])
    // Memory queries see the latest edit without waiting for SQLite.
    expect(runtime.project().getThought(a.id)?.value).toBe('second')
    release()
    await Promise.all([first.persisted, second.persisted])
    await runtime.waitForIdle()
    expect(view.getThought(a.id)!.value).toBe('second')
    expect(decodeThoughtPayload((await persistent.tree.getPayload(a.id))!).value).toBe('second')
  } finally {
    release()
    unsubscribe()
    await runtime.drop()
  }
})

it('publishes every newly received descendant and its current ancestor path after an incoming move', async () => {
  const persistent = await createTreecrdtClient({ docId: tsid, storage: { type: 'memory' } })
  const runtime = createMemoryThoughtspace(async () => persistent)
  let view: ThoughtspaceView = runtime.project()
  const unsubscribe = runtime.subscribe(() => {
    view = runtime.project()
  })
  const replica = new Uint8Array(32).fill(10)
  const parent = '3'.repeat(32) as ThoughtId
  const child = '4'.repeat(32) as ThoughtId
  const destination = '5'.repeat(32) as ThoughtId
  const payload = { created: 1 as Timestamp, lastUpdated: 1 as Timestamp, updatedBy: 'remote' }
  try {
    await runtime.init({ storage: 'memory' })
    view = runtime.project()
    await persistent.local.insert(
      replica,
      HOME_TOKEN,
      parent,
      { type: 'last' },
      encodeThoughtPayload({ ...payload, value: 'parent' }),
    )
    await persistent.local.insert(
      replica,
      parent,
      child,
      { type: 'last' },
      encodeThoughtPayload({ ...payload, value: 'child' }),
    )
    await runtime.waitForIdle()
    expect(view.getThought(parent)!).toMatchObject({ value: 'parent' })
    expect(view.getThought(parent)!).not.toHaveProperty('pending')
    expect(view.getThought(child)!.value).toBe('child')
    await persistent.local.insert(
      replica,
      HOME_TOKEN,
      destination,
      { type: 'last' },
      encodeThoughtPayload({ ...payload, value: 'destination' }),
    )
    await persistent.local.move(replica, child, destination, { type: 'last' })
    await runtime.waitForIdle()
    expect(view.getThought(child)!.parentId).toBe(destination)
    expect(view.getThought(destination)!.value).toBe('destination')
    expect(view.getChildren(parent)).not.toContain(child)
    await persistent.local.delete(replica, child)
    await runtime.waitForIdle()
    expect(view.getThought(child)).toBeUndefined()
  } finally {
    unsubscribe()
    await runtime.drop()
  }
})

it('loads all descendants before ready and serves ordinary queries and edit projection entirely from memory', async () => {
  const persistent = await createTreecrdtClient({ docId: tsid, storage: { type: 'memory' } })
  const memory = await createMemoryClient()
  const runtime = createMemoryThoughtspace(
    async () => persistent,
    async () => memory,
  )
  const replica = new Uint8Array(32).fill(11)
  const parents = Array.from({ length: 12 }, (_, i) => (100 + i).toString(16).padStart(32, '0') as ThoughtId)
  const children = Array.from({ length: 12 }, (_, i) => (200 + i).toString(16).padStart(32, '0') as ThoughtId)
  const grandchild = '7'.repeat(32) as ThoughtId
  const payload = { created: 1, lastUpdated: 1, updatedBy: 'remote' }
  let release!: () => void
  const gate = new Promise<void>(resolve => {
    release = resolve
  })
  let started!: () => void
  const loadingStarted = new Promise<void>(resolve => {
    started = resolve
  })
  try {
    await initializeMemoryStorage(persistent, replica)
    for (const [i, parent] of parents.entries()) {
      await persistent.local.insert(
        replica,
        HOME_TOKEN,
        parent,
        { type: 'last' },
        encodeThoughtPayload({ ...payload, value: `parent ${i}` }),
      )
      await persistent.local.insert(
        replica,
        parent,
        children[i],
        { type: 'last' },
        encodeThoughtPayload({ ...payload, value: `child ${i}` }),
      )
    }
    await persistent.local.insert(
      replica,
      children[0],
      grandchild,
      { type: 'last' },
      encodeThoughtPayload({ ...payload, value: 'deep descendant' }),
    )
    const getOps = persistent.ops.get.bind(persistent.ops)
    vi.spyOn(persistent.ops, 'get').mockImplementationOnce(async refs => {
      started()
      await gate
      return getOps(refs)
    })
    expect(runtime.ready).toBe(false)
    expect(() => runtime.transact(transaction => transaction.project())).toThrow('not ready for editing')
    const initializing = runtime.init({ storage: 'memory' })
    await loadingStarted
    expect(runtime.ready).toBe(false)
    expect(() => runtime.transact(transaction => transaction.project())).toThrow('not ready for editing')
    release()
    await initializing
    await runtime.waitForIdle()
    expect(runtime.ready).toBe(true)

    const view = runtime.project()
    const heldThought = view.getThought(grandchild)!
    const heldChildren = view.getChildren(children[0])
    expect(view.getThought(grandchild)!).toMatchObject({ value: 'deep descendant', parentId: children[0] })
    expect(view.getThought(grandchild)!).not.toHaveProperty('pending')
    expect(view.lexemeIndex[hashThought('deep descendant')].contexts).toEqual([grandchild])
    const storageReads = [
      vi.spyOn(persistent.runner, 'getText'),
      vi.spyOn(persistent.ops, 'get').mockClear(),
      vi.spyOn(persistent.opRefs, 'all'),
      vi.spyOn(persistent.tree, 'parent'),
      vi.spyOn(persistent.tree, 'children'),
      vi.spyOn(persistent.tree, 'getPayload'),
    ]
    const queried = runtime.project()
    expect(parents.map(id => queried.getChildren(id))).toEqual(children.map(child => [child]))
    expect(queried.getChildren(children[0])).toEqual([grandchild])
    expect(queried.lexemeIndex[hashThought('deep descendant')].contexts).toEqual([grandchild])
    expect([hashThought('parent 0'), hashThought('child 0')].map(key => queried.lexemeIndex[key].contexts)).toEqual([
      [parents[0]],
      [children[0]],
    ])
    for (const read of storageReads) expect(read).not.toHaveBeenCalled()

    const decoded = vi.spyOn(thoughtPayload, 'decodeThoughtPayload')
    expect(runtime.project()).toBe(view)
    const projected = runtime.project()
    expect(projected.getThought(grandchild)!).toBe(view.getThought(grandchild)!)
    expect(decoded).not.toHaveBeenCalled()
    const siblingReads = vi.spyOn(memory.tree, 'children')
    const changed = runtime.transact(transaction =>
      transaction.update({
        thoughtIndexUpdates: { [grandchild]: { ...view.getThought(grandchild)!, value: 'edited in memory' } },
      }),
    )
    expect(changed.value.getThought(grandchild)!.value).toBe('edited in memory')
    expect(changed.value.getChildren(children[0])).toBe(heldChildren)
    expect(Reflect.set(heldThought, 'value', 'corrupted')).toBe(false)
    expect(Reflect.set(heldChildren, '0', parents[0])).toBe(false)
    expect(view.getThought(grandchild)!.value).toBe('deep descendant')
    expect(decoded).toHaveBeenCalledTimes(1)
    expect(siblingReads).not.toHaveBeenCalled()
    expect(changed.value.getThought(children[0])!).toBe(view.getThought(children[0])!)
    expect(changed.value.getThought(parents[11])!).toBe(view.getThought(parents[11])!)
    for (const read of storageReads) expect(read).not.toHaveBeenCalled()
    await changed.persisted
    await runtime.waitForIdle()
  } finally {
    release()
    await runtime.drop()
  }
})

it('projects payload-bearing descendants and their canonical ranks under a payloadless parent', async () => {
  const persistent = await createTreecrdtClient({ docId: tsid, storage: { type: 'memory' } })
  const runtime = createMemoryThoughtspace(async () => persistent)
  const replica = new Uint8Array(32).fill(13)
  const parent = '8'.repeat(32) as ThoughtId
  const empty = '9'.repeat(32) as ThoughtId
  const child = 'a'.repeat(32) as ThoughtId
  const payload = { value: 'visible child', created: 1, lastUpdated: 1, updatedBy: 'remote' }
  try {
    await initializeMemoryStorage(persistent, replica)
    await persistent.local.insert(replica, HOME_TOKEN, parent, { type: 'last' }, null)
    await persistent.local.insert(replica, parent, empty, { type: 'first' }, null)
    await persistent.local.insert(replica, parent, child, { type: 'last' }, encodeThoughtPayload(payload))
    await runtime.init({ storage: 'memory' })
    const initial = runtime.project()
    expect(initial.getThought(parent)).toBeUndefined()
    expect(initial.getThought(empty)).toBeUndefined()
    expect(initial.getThought(child)!).toMatchObject({ value: 'visible child', parentId: parent })
    expect(initial.getPosition(child)).toBe(1)
    expect(initial.lexemeIndex[hashThought('visible child')].contexts).toEqual([child])

    await persistent.local.payload(replica, parent, encodeThoughtPayload({ ...payload, value: 'parent' }))
    await runtime.waitForIdle()
    const withParent = runtime.project()
    expect(withParent.getChildren(parent)).toEqual([child])
    expect(Reflect.set(withParent.getChildren(parent), '0', empty)).toBe(false)

    await persistent.local.payload(replica, child, null)
    await runtime.waitForIdle()
    expect(runtime.project().getThought(child)).toBeUndefined()
    expect(runtime.project().getChildren(parent)).toEqual([])
    expect(runtime.project().lexemeIndex[hashThought('visible child')]).toBeUndefined()
    expect(withParent.getChildren(parent)).toEqual([child])

    await persistent.local.payload(replica, child, encodeThoughtPayload(payload))
    await runtime.waitForIdle()
    expect(runtime.project().getThought(child)!).toMatchObject({ value: 'visible child', parentId: parent })
    expect(runtime.project().getChildren(parent)).toEqual([child])
    expect(runtime.project().getPosition(child)).toBe(1)
  } finally {
    await runtime.drop()
  }
})
