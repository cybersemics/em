import { createTreecrdtClient } from '@treecrdt/wa-sqlite'
import { tsid } from '../../thoughtspaceSession'
import createMemoryThoughtspace from '../createMemoryThoughtspace'

const { acquireSessionLock } = vi.hoisted(() => ({ acquireSessionLock: vi.fn() }))

// Session locks are browser-owned; the real memory and SQLite engines remain under test.
vi.mock('../sessionLock', () => ({ default: acquireSessionLock }))

afterEach(() => {
  acquireSessionLock.mockReset()
})

it.each([
  ['acquired', { status: 'acquired' }],
  ['unavailable', { status: 'blocked', reason: 'already-open' }],
  ['unsupported', { status: 'blocked', reason: 'unsupported' }],
] as const)('maps the %s session-lock status to thoughtspace access', async (lockStatus, access) => {
  acquireSessionLock.mockResolvedValue(lockStatus)
  const runtime = createMemoryThoughtspace()

  await expect(runtime.acquireAccess()).resolves.toEqual(access)
  expect(acquireSessionLock).toHaveBeenCalledExactlyOnceWith()
})

it('requires durable OPFS storage when persistent storage is requested', async () => {
  const failure = new Error('stop after capturing client options')
  const open = vi.fn(createTreecrdtClient).mockRejectedValueOnce(failure)
  const runtime = createMemoryThoughtspace(open)

  await expect(runtime.init({ storage: 'persistent', onError: () => undefined })).rejects.toBe(failure)
  expect(open).toHaveBeenCalledExactlyOnceWith({
    storage: {
      type: 'opfs',
      filename: `/treecrdt-em-memory-prototype-${tsid}.db`,
      fallback: 'throw',
    },
    runtime: { type: 'dedicated-worker' },
    docId: tsid,
  })
})

it('opens the client lazily after acquiring access', async () => {
  const open = vi.fn(createTreecrdtClient)
  const runtime = createMemoryThoughtspace(open)
  acquireSessionLock.mockResolvedValue('acquired')

  try {
    expect(open).not.toHaveBeenCalled()
    await expect(runtime.acquireAccess()).resolves.toEqual({ status: 'acquired' })
    expect(open).not.toHaveBeenCalled()

    await runtime.init({ storage: 'memory' })
    expect(open).toHaveBeenCalledExactlyOnceWith({
      storage: { type: 'memory' },
      runtime: { type: 'direct' },
      docId: tsid,
    })
  } finally {
    await runtime.drop()
  }
})

it('coalesces concurrent initialization into one client', async () => {
  const open = vi.fn(createTreecrdtClient)
  const runtime = createMemoryThoughtspace(open)

  try {
    const first = runtime.init({ storage: 'memory' })
    const second = runtime.init({ storage: 'memory' })
    expect(first).toBe(second)
    await expect(Promise.all([first, second])).resolves.toHaveLength(2)
    expect(open).toHaveBeenCalledTimes(1)
  } finally {
    await runtime.drop()
  }
})

it('discards a terminal client when drop reports an error and allows a fresh initialization', async () => {
  const client = await createTreecrdtClient({ docId: tsid, storage: { type: 'memory' }, runtime: { type: 'direct' } })
  const failure = new Error('client drop failed')
  const dropClient = client.drop.bind(client)
  // A durable client may report a failure after closing its underlying database.
  vi.spyOn(client, 'drop').mockImplementationOnce(async () => {
    await dropClient()
    throw failure
  })
  const open = vi.fn(createTreecrdtClient).mockResolvedValueOnce(client)
  const runtime = createMemoryThoughtspace(open)

  try {
    await runtime.init({ storage: 'memory', onError: () => undefined })
    await expect(runtime.drop()).rejects.toBe(failure)
    expect(runtime.ready).toBe(false)

    await expect(runtime.init({ storage: 'memory' })).resolves.toEqual({
      clientId: expect.any(String),
      storage: 'memory',
    })
    expect(runtime.ready).toBe(true)
    expect(open).toHaveBeenCalledTimes(2)
  } finally {
    await runtime.drop()
  }
})
