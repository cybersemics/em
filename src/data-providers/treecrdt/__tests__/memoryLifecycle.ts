import { type TreecrdtClient, createTreecrdtClient } from '@treecrdt/wa-sqlite'
import { createMemoryClient } from '@treecrdt/wasm'
import type Thought from '../../../@types/Thought'
import type ThoughtId from '../../../@types/ThoughtId'
import type Timestamp from '../../../@types/Timestamp'
import { HOME_TOKEN } from '../../../constants'
import { tsid } from '../../thoughtspaceSession'
import createMemoryThoughtspace from '../createMemoryThoughtspace'
import { encodeThoughtPayload } from '../payload'

it('retries initialization after opening fails', async () => {
  const failure = new Error('Opening failed')
  const onError = vi.fn()
  const open = vi.fn(createTreecrdtClient).mockRejectedValueOnce(failure)
  const runtime = createMemoryThoughtspace(open)
  try {
    await expect(runtime.init({ storage: 'memory', onError })).rejects.toBe(failure)
    await runtime.init({ storage: 'memory', onError })
    expect(runtime.project().thoughtIndex[HOME_TOKEN]?.id).toBe(HOME_TOKEN)
    expect(onError).toHaveBeenCalledExactlyOnceWith(failure)
    expect(open).toHaveBeenCalledTimes(2)
  } finally {
    await runtime.drop()
  }
})

it('closes a partially initialized client before retrying bootstrap', async () => {
  const failure = new Error('Bootstrap failed')
  const client = await createTreecrdtClient({ storage: { type: 'memory' } })
  const close = vi.spyOn(client, 'close')
  vi.spyOn(client.tree, 'getPayload').mockRejectedValueOnce(failure)
  const open = vi.fn(createTreecrdtClient).mockResolvedValueOnce(client)
  const onError = vi.fn()
  const runtime = createMemoryThoughtspace(open)
  try {
    await expect(runtime.init({ storage: 'memory', onError })).rejects.toBe(failure)
    expect(close).toHaveBeenCalledTimes(1)
    await runtime.init({ storage: 'memory', onError })
    expect(runtime.project().thoughtIndex[HOME_TOKEN]?.id).toBe(HOME_TOKEN)
    expect(open).toHaveBeenCalledTimes(2)
  } finally {
    await runtime.drop()
  }
})

it('reopens only after a concurrent drop finishes and blocks editing during teardown', async () => {
  let persistent!: TreecrdtClient
  const open = vi.fn(async options => {
    persistent = await createTreecrdtClient(options)
    return persistent
  })
  const runtime = createMemoryThoughtspace(open)
  let release!: () => void
  const gate = new Promise<void>(resolve => {
    release = resolve
  })
  let started!: () => void
  const droppingStarted = new Promise<void>(resolve => {
    started = resolve
  })
  try {
    await runtime.init({ storage: 'memory' })
    const dropClient = persistent.drop.bind(persistent)
    vi.spyOn(persistent, 'drop').mockImplementationOnce(async () => {
      started()
      await gate
      await dropClient()
    })
    const dropping = runtime.drop()
    const reopening = runtime.init({ storage: 'memory' })
    await droppingStarted
    expect(open).toHaveBeenCalledTimes(1)
    expect(() => runtime.transact(document => document.project())).toThrow('not ready for editing')
    release()
    await Promise.all([dropping, reopening])
    expect(open).toHaveBeenCalledTimes(2)
    expect(runtime.project().thoughtIndex[HOME_TOKEN]?.id).toBe(HOME_TOKEN)
  } finally {
    release()
    await runtime.drop()
  }
})

it('reports a failed durable append and rejects later commands before authoring them', async () => {
  const persistent = await createTreecrdtClient({ docId: tsid, storage: { type: 'memory' } })
  const runtime = createMemoryThoughtspace(async () => persistent)
  const failure = new Error('Durable append failed')
  const onError = vi.fn()
  const thought: Thought = {
    id: '1'.repeat(32) as ThoughtId,
    parentId: HOME_TOKEN,
    rank: 0,
    childrenMap: {},
    value: 'accepted before failure',
    created: 1 as Timestamp,
    lastUpdated: 1 as Timestamp,
    updatedBy: 'test',
  }
  try {
    await runtime.init({ storage: 'memory', onError })
    runtime.project()
    vi.spyOn(persistent.ops, 'appendMany').mockRejectedValueOnce(failure)
    const first = runtime.transact(document =>
      document.update({ thoughtIndexUpdates: { [thought.id]: thought }, movePlacements: { [thought.id]: null } }),
    )
    await expect(first.persisted).rejects.toBe(failure)
    expect(onError).toHaveBeenCalledExactlyOnceWith(failure)
    expect(() =>
      runtime.transact(document =>
        document.update({
          thoughtIndexUpdates: { [thought.id]: { ...thought, value: 'must not be authored' } },
        }),
      ),
    ).toThrow(failure)
    await expect(runtime.waitForIdle()).rejects.toBe(failure)
    expect(await persistent.tree.exists(thought.id)).toBe(false)
  } finally {
    await runtime.drop()
  }
})

it('reports a failed loopback operation-log read and gates later edits', async () => {
  const persistent = await createTreecrdtClient({ docId: tsid, storage: { type: 'memory' } })
  const runtime = createMemoryThoughtspace(async () => persistent)
  const failure = new Error('Operation-log read failed')
  const onError = vi.fn()
  const node = '2'.repeat(32) as ThoughtId
  try {
    await runtime.init({ storage: 'memory', onError })
    await runtime.waitForIdle()
    vi.spyOn(persistent.opRefs, 'all').mockRejectedValueOnce(failure)
    await persistent.local.insert(
      new Uint8Array(32).fill(9),
      HOME_TOKEN,
      node,
      { type: 'first' },
      encodeThoughtPayload({ value: 'durable', created: 1, lastUpdated: 1, updatedBy: 'test' }),
    )
    await expect(runtime.waitForIdle()).rejects.toThrow('Operation-log read failed')
    expect(onError).toHaveBeenCalledTimes(1)
    expect(() => runtime.transact(document => document.project())).toThrow('Operation-log read failed')
    expect(await persistent.tree.exists(node)).toBe(true)
  } finally {
    await runtime.drop()
  }
})

it('reports a failed incoming WASM batch and gates later edits without publishing it', async () => {
  let persistent!: TreecrdtClient
  const memory = await createMemoryClient()
  const runtime = createMemoryThoughtspace(
    async options => {
      persistent = await createTreecrdtClient(options)
      return persistent
    },
    async () => memory,
  )
  const onError = vi.fn()
  const node = '3'.repeat(32) as ThoughtId
  try {
    await runtime.init({ storage: 'memory', onError })
    await runtime.waitForIdle()
    vi.spyOn(memory, 'appendOperations').mockImplementationOnce(() => {
      throw new Error('Incoming batch failed')
    })
    await persistent.local.insert(
      new Uint8Array(32).fill(9),
      HOME_TOKEN,
      node,
      { type: 'first' },
      encodeThoughtPayload({ value: 'not published', created: 1, lastUpdated: 1, updatedBy: 'test' }),
    )
    await expect(runtime.waitForIdle()).rejects.toThrow('Incoming batch failed')
    expect(onError).toHaveBeenCalledTimes(1)
    expect(() => runtime.transact(document => document.project())).toThrow('Incoming batch failed')
    expect(runtime.project().thoughtIndex[node]).toBeUndefined()
    expect(await persistent.tree.exists(node)).toBe(true)
  } finally {
    await runtime.drop()
  }
})

it('waits for initialization to settle before dropping and reopening its database', async () => {
  let release!: () => void
  const gate = new Promise<void>(resolve => {
    release = resolve
  })
  let started!: () => void
  const openingStarted = new Promise<void>(resolve => {
    started = resolve
  })
  const open = vi.fn(createTreecrdtClient).mockImplementationOnce(async options => {
    const client = await createTreecrdtClient(options)
    started()
    await gate
    return client
  })
  const runtime = createMemoryThoughtspace(open)
  try {
    const initializing = runtime.init({ storage: 'memory' })
    await openingStarted
    const dropping = runtime.drop()
    const reopening = runtime.init({ storage: 'memory' })
    expect(open).toHaveBeenCalledTimes(1)
    expect(() => runtime.transact(document => document.project())).toThrow('not ready for editing')
    release()
    await Promise.all([initializing, dropping, reopening])
    expect(open).toHaveBeenCalledTimes(2)
    expect(runtime.project().thoughtIndex[HOME_TOKEN]?.id).toBe(HOME_TOKEN)
  } finally {
    release()
    await runtime.drop()
  }
})
