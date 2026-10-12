import { type TreecrdtClient, createTreecrdtClient } from '@treecrdt/wa-sqlite'
import { createMemoryClient } from '@treecrdt/wasm/memory'
import type Thought from '../../../@types/Thought'
import type ThoughtId from '../../../@types/ThoughtId'
import type Timestamp from '../../../@types/Timestamp'
import { HOME_TOKEN } from '../../../constants'
import { tsid } from '../../thoughtspaceSession'
import createMemoryThoughtspace from '../createMemoryThoughtspace'
import { decodeThoughtPayload, encodeThoughtPayload } from '../payload'

const thought: Thought = {
  id: '1'.repeat(32) as ThoughtId,
  parentId: HOME_TOKEN,
  value: 'accepted before failure',
  created: 1 as Timestamp,
  lastUpdated: 1 as Timestamp,
  updatedBy: 'test',
}

it('retries initialization after opening fails', async () => {
  const failure = new Error('Opening failed')
  const onError = vi.fn()
  const open = vi.fn(createTreecrdtClient).mockRejectedValueOnce(failure)
  const runtime = createMemoryThoughtspace(open)
  try {
    await expect(runtime.init({ storage: 'memory', onError })).rejects.toBe(failure)
    await runtime.init({ storage: 'memory', onError })
    expect(runtime.project().getThought(HOME_TOKEN)?.id).toBe(HOME_TOKEN)
    expect(onError).toHaveBeenCalledExactlyOnceWith(failure)
    expect(open).toHaveBeenCalledTimes(2)
  } finally {
    await runtime.drop()
  }
})

it('closes a partially initialized client before retrying bootstrap', async () => {
  const failure = new Error('Bootstrap failed')
  const client = await createTreecrdtClient({ docId: tsid })
  const close = vi.spyOn(client, 'close')
  vi.spyOn(client.tree.root, 'payload').mockRejectedValueOnce(failure)
  const open = vi.fn(createTreecrdtClient).mockResolvedValueOnce(client)
  const onError = vi.fn()
  const runtime = createMemoryThoughtspace(open)
  try {
    await expect(runtime.init({ storage: 'memory', onError })).rejects.toBe(failure)
    expect(close).toHaveBeenCalledTimes(1)
    await runtime.init({ storage: 'memory', onError })
    expect(runtime.project().getThought(HOME_TOKEN)?.id).toBe(HOME_TOKEN)
    expect(open).toHaveBeenCalledTimes(2)
  } finally {
    await runtime.drop()
  }
})

it('rejects initialization when the automatic subscription push fails before hydration succeeds', async () => {
  const failure = new Error('Initial subscription push failed')
  const persistent = await createTreecrdtClient({ docId: tsid })
  const close = vi.spyOn(persistent, 'close')
  const listOpRefs = persistent.opRefs.all.bind(persistent.opRefs)
  // Subscription setup succeeds; its automatic push fails, while the following hydration read succeeds.
  vi.spyOn(persistent.opRefs, 'all').mockImplementationOnce(listOpRefs).mockRejectedValueOnce(failure)
  const onError = vi.fn()
  const open = vi.fn(createTreecrdtClient).mockResolvedValueOnce(persistent)
  const runtime = createMemoryThoughtspace(open)
  try {
    await expect(runtime.init({ storage: 'memory', onError })).rejects.toBe(failure)
    expect(runtime.ready).toBe(false)
    expect(close).toHaveBeenCalledTimes(1)
    expect(onError).toHaveBeenCalledExactlyOnceWith(failure)

    await runtime.init({ storage: 'memory', onError })
    expect(runtime.ready).toBe(true)
    expect(runtime.project().getThought(HOME_TOKEN)?.id).toBe(HOME_TOKEN)
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
    expect(() => runtime.transact(transaction => transaction.project())).toThrow('not ready for editing')
    release()
    await Promise.all([dropping, reopening])
    expect(open).toHaveBeenCalledTimes(2)
    expect(runtime.project().getThought(HOME_TOKEN)?.id).toBe(HOME_TOKEN)
  } finally {
    release()
    await runtime.drop()
  }
})

it('preserves earlier acknowledgements, latches a failed append without retrying, and clears failure on drop', async () => {
  const persistent = await createTreecrdtClient({ docId: tsid })
  const runtime = createMemoryThoughtspace(vi.fn(createTreecrdtClient).mockResolvedValueOnce(persistent))
  const failure = new Error('Durable append failed')
  const onError = vi.fn()
  const acknowledged = vi.fn()
  const rejectedAcknowledgement = vi.fn()
  try {
    await runtime.init({ storage: 'memory', onError })
    const appendMany = persistent.ops.appendMany.bind(persistent.ops)
    const append = vi
      .spyOn(persistent.ops, 'appendMany')
      .mockImplementationOnce(appendMany)
      .mockRejectedValueOnce(failure)
    const first = runtime.transact(transaction => {
      transaction.insert(thought, null)
      transaction.afterPersist(acknowledged)
    })
    const second = runtime.transact(transaction => {
      transaction.payload(thought.id, { value: 'unsaved edit' })
      transaction.afterPersist(rejectedAcknowledgement)
    })
    const empty = runtime.transact(transaction => transaction.afterPersist(rejectedAcknowledgement))
    await Promise.all([
      expect(first.persisted).resolves.toBeUndefined(),
      expect(second.persisted).rejects.toBe(failure),
      expect(empty.persisted).rejects.toBe(failure),
    ])
    expect(acknowledged).toHaveBeenCalledTimes(1)
    expect(rejectedAcknowledgement).not.toHaveBeenCalled()
    expect(onError).toHaveBeenCalledExactlyOnceWith(failure)
    expect(() =>
      runtime.transact(transaction =>
        transaction.update({
          thoughtIndexUpdates: { [thought.id]: { ...thought, value: 'must not be authored' } },
        }),
      ),
    ).toThrow(failure)
    await expect(runtime.waitForIdle()).rejects.toBe(failure)
    expect(append).toHaveBeenCalledTimes(2)
    expect(decodeThoughtPayload((await (await persistent.tree.get(thought.id))!.payload())!).value).toBe(thought.value)
    expect(runtime.project().getThought(thought.id)?.value).toBe('unsaved edit')

    await runtime.drop()
    await runtime.init({ storage: 'memory', onError })
    const retried = runtime.transact(transaction =>
      transaction.update({ thoughtIndexUpdates: { [thought.id]: thought }, movePlacements: { [thought.id]: null } }),
    )
    await retried.persisted
    await runtime.waitForIdle()
    expect(runtime.project().getThought(thought.id)?.value).toBe(thought.value)
    expect(onError).toHaveBeenCalledTimes(1)
  } finally {
    await runtime.drop()
  }
})

it('drains an active append and a queued command before dropping storage', async () => {
  const persistent = await createTreecrdtClient({ docId: tsid })
  const runtime = createMemoryThoughtspace(async () => persistent)
  let release!: () => void
  const gate = new Promise<void>(resolve => {
    release = resolve
  })
  let started!: () => void
  const appendStarted = new Promise<void>(resolve => {
    started = resolve
  })
  const valuesAtDrop: string[] = []
  try {
    await runtime.init({ storage: 'memory' })
    const append = persistent.ops.appendMany.bind(persistent.ops)
    vi.spyOn(persistent.ops, 'appendMany').mockImplementationOnce(async (operations, options) => {
      started()
      await gate
      return append(operations, options)
    })
    const dropClient = persistent.drop.bind(persistent)
    vi.spyOn(persistent, 'drop').mockImplementationOnce(async () => {
      valuesAtDrop.push(decodeThoughtPayload((await (await persistent.tree.get(thought.id))!.payload())!).value)
      await dropClient()
    })
    const first = runtime.transact(transaction => transaction.insert(thought, null))
    const second = runtime.transact(transaction => transaction.payload(thought.id, { value: 'queued edit' }))
    await appendStarted
    const dropping = runtime.drop()
    release()
    await Promise.all([first.persisted, second.persisted, dropping])
    expect(valuesAtDrop).toEqual(['queued edit'])
  } finally {
    release()
    await runtime.drop()
  }
})

it('waits for a command authored by an afterPersist callback before reporting idle', async () => {
  const persistent = await createTreecrdtClient({ docId: tsid })
  const runtime = createMemoryThoughtspace(async () => persistent)
  let release!: () => void
  const gate = new Promise<void>(resolve => {
    release = resolve
  })
  let started!: () => void
  const appendStarted = new Promise<void>(resolve => {
    started = resolve
  })
  const phases: string[] = []
  let nextPersisted!: Promise<void>
  try {
    await runtime.init({ storage: 'memory' })
    const append = persistent.ops.appendMany.bind(persistent.ops)
    vi.spyOn(persistent.ops, 'appendMany')
      .mockImplementationOnce(append)
      .mockImplementationOnce(async (operations, options) => {
        started()
        await gate
        await append(operations, options)
        phases.push('stored')
      })
    const first = runtime.transact(transaction => {
      transaction.insert(thought, null)
      transaction.afterPersist(() => {
        nextPersisted = runtime.transact(next => next.payload(thought.id, { value: 'after persistence' })).persisted
      })
    })
    const waiting = runtime.waitForIdle().then(() => phases.push('idle'))
    await appendStarted
    release()
    await Promise.all([first.persisted, nextPersisted, waiting])
    expect(phases).toEqual(['stored', 'idle'])
    expect(decodeThoughtPayload((await (await persistent.tree.get(thought.id))!.payload())!).value).toBe(
      'after persistence',
    )
  } finally {
    release()
    await runtime.drop()
  }
})

it('reports a failed loopback operation-log read and gates later edits', async () => {
  const persistent = await createTreecrdtClient({ docId: tsid })
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
    expect(() => runtime.transact(transaction => transaction.project())).toThrow('Operation-log read failed')
    expect(await persistent.tree.get(node)).toBeDefined()
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
    expect(() => runtime.transact(transaction => transaction.project())).toThrow('Incoming batch failed')
    expect(runtime.project().getThought(node)).toBeUndefined()
    expect(await persistent.tree.get(node)).toBeDefined()
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
    expect(() => runtime.transact(transaction => transaction.project())).toThrow('not ready for editing')
    release()
    await Promise.all([initializing, dropping, reopening])
    expect(open).toHaveBeenCalledTimes(2)
    expect(runtime.project().getThought(HOME_TOKEN)?.id).toBe(HOME_TOKEN)
  } finally {
    release()
    await runtime.drop()
  }
})
