import { type TreecrdtClient, createTreecrdtClient } from '@treecrdt/wa-sqlite'
import { createMemoryClient } from '@treecrdt/wasm'
import type Thought from '../../../@types/Thought'
import type ThoughtId from '../../../@types/ThoughtId'
import type ThoughtIndices from '../../../@types/ThoughtIndices'
import type Timestamp from '../../../@types/Timestamp'
import { HOME_TOKEN } from '../../../constants'
import * as childrenMaps from '../../../util/createChildrenMap'
import hashThought from '../../../util/hashThought'
import { tsid } from '../../thoughtspaceSession'
import createMemoryThoughtspace from '../createMemoryThoughtspace'
import initializeMemoryStorage from '../initializeMemoryStorage'
import { decodeThoughtPayload, encodeThoughtPayload } from '../payload'
import * as thoughtPayload from '../payload'

it('publishes incoming edits and order, and keeps a newer memory edit while an older write is awaiting storage', async () => {
  let persistent!: TreecrdtClient
  const runtime = createMemoryThoughtspace(async options => {
    persistent = await createTreecrdtClient(options)
    return persistent
  })
  let view: ThoughtIndices = { thoughtIndex: {}, lexemeIndex: {} }
  const payload = { value: 'a', created: 1 as Timestamp, lastUpdated: 1 as Timestamp, updatedBy: 'test' }
  const a: Thought = { ...payload, id: '1'.repeat(32) as ThoughtId, parentId: HOME_TOKEN, rank: 0, childrenMap: {} }
  const b: Thought = { ...a, id: '2'.repeat(32) as ThoughtId, value: 'b', rank: 1 }
  let release!: () => void
  const gate = new Promise<void>(resolve => {
    release = resolve
  })
  try {
    await runtime.init({
      storage: 'memory',
      onChange: thoughts => {
        view = thoughts
      },
    })
    view.thoughtIndex = { [HOME_TOKEN]: runtime.project().thoughtIndex[HOME_TOKEN]!, [a.id]: a, [b.id]: b }
    const initial = runtime.transact(document =>
      document.update(
        { thoughtIndexUpdates: { [a.id]: a, [b.id]: b }, movePlacements: { [a.id]: null, [b.id]: a.id } },
        view,
      ),
    )
    view = initial.value
    await initial.persisted
    await runtime.waitForIdle()

    const decoded = vi.spyOn(thoughtPayload, 'decodeThoughtPayload')
    expect(runtime.project(view)).toBe(view)
    expect(decoded).not.toHaveBeenCalled()
    decoded.mockRestore()

    const remoteReplica = new Uint8Array(32).fill(9)
    const child = '6'.repeat(32) as ThoughtId
    // Every descendant arrives without an explicit getThoughtById or force-pull.
    await persistent.local.insert(
      remoteReplica,
      a.id,
      child,
      { type: 'last' },
      encodeThoughtPayload({ ...payload, value: 'incoming child' }),
    )
    await runtime.waitForIdle()
    expect(view.thoughtIndex[child]).toMatchObject({ value: 'incoming child', parentId: a.id })
    await persistent.local.payload(remoteReplica, a.id, encodeThoughtPayload({ ...payload, value: "O'Reilly ?1 $&" }))
    await persistent.local.move(remoteReplica, b.id, HOME_TOKEN, { type: 'first' })
    await runtime.waitForIdle()
    expect(view.thoughtIndex[a.id]).toMatchObject({ value: "O'Reilly ?1 $&", rank: 1 })
    expect(view.thoughtIndex[b.id].rank).toBe(0)
    expect(view.lexemeIndex[hashThought("O'Reilly ?1 $&")].contexts).toEqual([a.id])
    runtime.project()

    const append = persistent.ops.appendMany.bind(persistent.ops)
    vi.spyOn(persistent.ops, 'appendMany').mockImplementationOnce(async ops => {
      await gate
      return append(ops)
    })
    const first = runtime.transact(document =>
      document.update(
        {
          thoughtIndexUpdates: { [a.id]: { ...a, value: 'first', rank: 1 } },
        },
        view,
      ),
    )
    view = first.value
    const second = runtime.transact(document =>
      document.update(
        {
          thoughtIndexUpdates: { [a.id]: { ...a, value: 'second', rank: 1 } },
        },
        view,
      ),
    )
    view = second.value
    expect(view.thoughtIndex[a.id].value).toBe('second')
    expect(view.lexemeIndex[hashThought('second')].contexts).toEqual([a.id])
    // Memory queries see the latest edit without waiting for SQLite.
    expect(runtime.project().thoughtIndex[a.id]?.value).toBe('second')
    release()
    await Promise.all([first.persisted, second.persisted])
    await runtime.waitForIdle()
    expect(view.thoughtIndex[a.id].value).toBe('second')
    expect(decodeThoughtPayload((await persistent.tree.getPayload(a.id))!).value).toBe('second')
  } finally {
    release()
    await runtime.drop()
  }
})

it('publishes every newly received descendant and its current ancestor path after an incoming move', async () => {
  let persistent!: TreecrdtClient
  const runtime = createMemoryThoughtspace(async options => {
    persistent = await createTreecrdtClient(options)
    return persistent
  })
  let view: ThoughtIndices = { thoughtIndex: {}, lexemeIndex: {} }
  const replica = new Uint8Array(32).fill(10)
  const parent = '3'.repeat(32) as ThoughtId
  const child = '4'.repeat(32) as ThoughtId
  const destination = '5'.repeat(32) as ThoughtId
  const payload = { created: 1 as Timestamp, lastUpdated: 1 as Timestamp, updatedBy: 'remote' }
  try {
    await runtime.init({
      storage: 'memory',
      onChange: thoughts => {
        view = thoughts
      },
    })
    view = runtime.project({
      thoughtIndex: { [HOME_TOKEN]: runtime.project().thoughtIndex[HOME_TOKEN]! },
      lexemeIndex: {},
    })
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
    expect(view.thoughtIndex[parent]).toMatchObject({ value: 'parent' })
    expect(view.thoughtIndex[parent]).not.toHaveProperty('pending')
    expect(view.thoughtIndex[child].value).toBe('child')
    await persistent.local.insert(
      replica,
      HOME_TOKEN,
      destination,
      { type: 'last' },
      encodeThoughtPayload({ ...payload, value: 'destination' }),
    )
    await persistent.local.move(replica, child, destination, { type: 'last' })
    await runtime.waitForIdle()
    expect(view.thoughtIndex[child].parentId).toBe(destination)
    expect(view.thoughtIndex[destination].value).toBe('destination')
    expect(Object.values(view.thoughtIndex[parent].childrenMap)).not.toContain(child)
    await persistent.local.delete(replica, child)
    await runtime.waitForIdle()
    expect(view.thoughtIndex[child]).toBeUndefined()
  } finally {
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
    const initializing = runtime.init({ storage: 'memory' })
    await loadingStarted
    expect(runtime.ready).toBe(false)
    expect(() => runtime.transact(document => document.project())).toThrow('not ready for editing')
    release()
    await initializing
    await runtime.waitForIdle()
    expect(runtime.ready).toBe(true)

    const view = runtime.project()
    expect(view.thoughtIndex[grandchild]).toMatchObject({ value: 'deep descendant', parentId: children[0] })
    expect(view.thoughtIndex[grandchild]).not.toHaveProperty('pending')
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
    expect(parents.map(id => Object.values(queried.thoughtIndex[id].childrenMap))).toEqual(
      children.map(child => [child]),
    )
    expect(queried.thoughtIndex[children[0]].childrenMap[grandchild]).toBe(grandchild)
    expect(queried.lexemeIndex[hashThought('deep descendant')].contexts).toEqual([grandchild])
    expect([hashThought('parent 0'), hashThought('child 0')].map(key => queried.lexemeIndex[key].contexts)).toEqual([
      [parents[0]],
      [children[0]],
    ])
    for (const read of storageReads) expect(read).not.toHaveBeenCalled()

    const decoded = vi.spyOn(thoughtPayload, 'decodeThoughtPayload')
    const projected = runtime.project({ thoughtIndex: {}, lexemeIndex: {} })
    expect(projected.thoughtIndex[grandchild]).toBe(view.thoughtIndex[grandchild])
    expect(decoded).not.toHaveBeenCalled()
    const siblingReads = vi.spyOn(memory.tree, 'children')
    const childKeys = vi.spyOn(childrenMaps, 'childrenMapKey')
    const changed = runtime.transact(document =>
      document.update({
        thoughtIndexUpdates: { [grandchild]: { ...view.thoughtIndex[grandchild], value: 'edited in memory' } },
      }),
    )
    expect(changed.value.thoughtIndex[grandchild].value).toBe('edited in memory')
    expect(decoded).toHaveBeenCalledTimes(1)
    expect(siblingReads).not.toHaveBeenCalled()
    expect(childKeys).not.toHaveBeenCalled()
    expect(changed.value.thoughtIndex[children[0]]).toBe(view.thoughtIndex[children[0]])
    expect(changed.value.thoughtIndex[parents[11]]).toBe(view.thoughtIndex[parents[11]])
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
    expect(initial.thoughtIndex[parent]).toBeUndefined()
    expect(initial.thoughtIndex[empty]).toBeUndefined()
    expect(initial.thoughtIndex[child]).toMatchObject({ value: 'visible child', parentId: parent, rank: 1 })
    expect(initial.lexemeIndex[hashThought('visible child')].contexts).toEqual([child])

    await persistent.local.payload(replica, child, null)
    await runtime.waitForIdle()
    expect(runtime.project().thoughtIndex[child]).toBeUndefined()
    expect(runtime.project().lexemeIndex[hashThought('visible child')]).toBeUndefined()

    await persistent.local.payload(replica, child, encodeThoughtPayload(payload))
    await runtime.waitForIdle()
    expect(runtime.project().thoughtIndex[child]).toMatchObject({ value: 'visible child', parentId: parent, rank: 1 })
  } finally {
    await runtime.drop()
  }
})
