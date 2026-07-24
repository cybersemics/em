import { EM_TOKEN } from '../../../constants'
import createTreecrdtThoughtspace, { getTreecrdtClientOptions } from '../runtime'

const { acquireTreecrdtSessionLock, createTreecrdtClient, initPermissionsStore } = vi.hoisted(() => ({
  acquireTreecrdtSessionLock: vi.fn(),
  createTreecrdtClient: vi.fn(),
  initPermissionsStore: vi.fn(),
}))

vi.mock('../sessionLock', () => ({ default: acquireTreecrdtSessionLock }))
vi.mock('../../permissionsStore', () => ({ initPermissionsStore }))
vi.mock('@treecrdt/wa-sqlite', async importOriginal => {
  const actual = await importOriginal<typeof import('@treecrdt/wa-sqlite')>()
  return { ...actual, createTreecrdtClient }
})

const emptyUpdates = {
  thoughtIndexUpdates: {},
  lexemeIndexUpdates: {},
  lexemeIndexUpdatesOld: {},
  schemaVersion: 0,
}

beforeEach(() => {
  initPermissionsStore.mockResolvedValue(undefined)
})

afterEach(() => {
  acquireTreecrdtSessionLock.mockReset()
  createTreecrdtClient.mockReset()
  initPermissionsStore.mockReset()
})

it.each([
  ['acquired', { status: 'acquired' }],
  ['unavailable', { status: 'blocked', reason: 'already-open' }],
  ['unsupported', { status: 'blocked', reason: 'unsupported' }],
] as const)('maps the %s session-lock status to thoughtspace access', async (lockStatus, access) => {
  acquireTreecrdtSessionLock.mockResolvedValue(lockStatus)
  const treecrdtThoughtspace = createTreecrdtThoughtspace({ tabPolicy: 'single' })

  await expect(treecrdtThoughtspace.acquireAccess()).resolves.toEqual(access)
  expect(acquireTreecrdtSessionLock).toHaveBeenCalledWith()
})

it('does not require a session lock when multiple tabs are allowed', async () => {
  const treecrdtThoughtspace = createTreecrdtThoughtspace({
    client: { storage: 'memory', runtime: 'direct' },
    tabPolicy: 'multiple',
  })

  await expect(treecrdtThoughtspace.acquireAccess()).resolves.toEqual({ status: 'acquired' })
  expect(acquireTreecrdtSessionLock).not.toHaveBeenCalled()
})

it('rejects unsupported multiple-tab client settings at both the type and runtime boundaries', () => {
  // Pre-bootstrap configuration crosses a JavaScript boundary, so retain the runtime guard in addition to the type.
  // @ts-expect-error Persistent dedicated-worker storage is incompatible with multiple-tab access.
  const invalidConfig: Parameters<typeof createTreecrdtThoughtspace>[0] = {
    client: { storage: 'persistent', runtime: 'dedicated-worker' },
    tabPolicy: 'multiple',
  }

  expect(() => createTreecrdtThoughtspace(invalidConfig)).toThrow(
    'Multiple-tab TreeCRDT access requires in-memory storage with the direct runtime.',
  )
})

it('maps em in-memory storage to TreeCRDT memory client options', () => {
  expect(
    getTreecrdtClientOptions({
      storage: 'memory',
      runtime: 'direct',
      docId: 'memory-doc',
    }),
  ).toEqual({
    storage: { type: 'memory' },
    runtime: { type: 'direct' },
    docId: 'memory-doc',
  })
})

it('maps em persistent storage to TreeCRDT OPFS client options', () => {
  expect(
    getTreecrdtClientOptions({
      storage: 'persistent',
      runtime: 'dedicated-worker',
      docId: 'persistent-doc',
    }),
  ).toEqual({
    storage: {
      type: 'opfs',
      filename: expect.any(String),
      fallback: 'throw',
    },
    runtime: { type: 'dedicated-worker' },
    docId: 'persistent-doc',
  })
})

it('creates the client lazily', async () => {
  const actual = await vi.importActual<typeof import('@treecrdt/wa-sqlite')>('@treecrdt/wa-sqlite')
  createTreecrdtClient.mockImplementation(actual.createTreecrdtClient)

  const treecrdtThoughtspace = createTreecrdtThoughtspace({
    client: { storage: 'memory', runtime: 'direct' },
    tabPolicy: 'multiple',
  })

  expect(createTreecrdtClient).not.toHaveBeenCalled()
  await treecrdtThoughtspace.acquireAccess()
  expect(createTreecrdtClient).not.toHaveBeenCalled()

  await treecrdtThoughtspace.init()
  expect(createTreecrdtClient).toHaveBeenCalledTimes(1)

  await treecrdtThoughtspace.drop()
})

it('coalesces concurrent initialization into one client', async () => {
  const actual = await vi.importActual<typeof import('@treecrdt/wa-sqlite')>('@treecrdt/wa-sqlite')
  createTreecrdtClient.mockImplementation(actual.createTreecrdtClient)

  const treecrdtThoughtspace = createTreecrdtThoughtspace({
    client: { storage: 'memory', runtime: 'direct' },
    tabPolicy: 'multiple',
  })
  const firstInit = treecrdtThoughtspace.init()
  const secondInit = treecrdtThoughtspace.init()

  expect(secondInit).toBe(firstInit)
  await expect(Promise.all([firstInit, secondInit])).resolves.toHaveLength(2)
  expect(createTreecrdtClient).toHaveBeenCalledTimes(1)

  await treecrdtThoughtspace.drop()
})

it('completes an in-flight init before a following drop and can initialize again', async () => {
  const actual = await vi.importActual<typeof import('@treecrdt/wa-sqlite')>('@treecrdt/wa-sqlite')
  let releaseClient!: () => void
  let markClientStarted!: () => void
  const clientStarted = new Promise<void>(resolve => {
    markClientStarted = resolve
  })
  const clientReleased = new Promise<void>(resolve => {
    releaseClient = resolve
  })
  createTreecrdtClient.mockImplementation(async options => {
    markClientStarted()
    await clientReleased
    return actual.createTreecrdtClient(options)
  })

  const treecrdtThoughtspace = createTreecrdtThoughtspace({
    client: { storage: 'memory', runtime: 'direct' },
    tabPolicy: 'multiple',
  })
  const init = treecrdtThoughtspace.init()
  await clientStarted
  const drop = treecrdtThoughtspace.drop()

  releaseClient()
  await init
  await drop

  expect(() => treecrdtThoughtspace.db.getThoughtById('missing' as never)).toThrow(
    'TreeCRDT DataProvider: init not called',
  )

  await treecrdtThoughtspace.init()
  await treecrdtThoughtspace.drop()
})

it('preserves init, drop, init call order without intermediate awaits', async () => {
  const actual = await vi.importActual<typeof import('@treecrdt/wa-sqlite')>('@treecrdt/wa-sqlite')
  createTreecrdtClient.mockImplementation(actual.createTreecrdtClient)
  const treecrdtThoughtspace = createTreecrdtThoughtspace({
    client: { storage: 'memory', runtime: 'direct' },
    tabPolicy: 'multiple',
  })

  const firstInit = treecrdtThoughtspace.init()
  const drop = treecrdtThoughtspace.drop()
  const secondInit = treecrdtThoughtspace.init()
  await Promise.all([firstInit, drop, secondInit])

  expect(createTreecrdtClient).toHaveBeenCalledTimes(2)
  await expect(treecrdtThoughtspace.db.getThoughtById(EM_TOKEN)).resolves.toMatchObject({ id: EM_TOKEN })

  await treecrdtThoughtspace.drop()
})

it('rejects queued startup writes when permissions initialization fails', async () => {
  const initError = new Error('permissions initialization failed')
  initPermissionsStore.mockRejectedValueOnce(initError)

  const treecrdtThoughtspace = createTreecrdtThoughtspace({
    client: { storage: 'memory', runtime: 'direct' },
    tabPolicy: 'multiple',
  })
  const queuedWrite = treecrdtThoughtspace.db.updateThoughts(emptyUpdates)
  const queuedWriteExpectation = expect(queuedWrite).rejects.toBe(initError)

  await expect(treecrdtThoughtspace.init()).rejects.toBe(initError)
  await queuedWriteExpectation

  const actual = await vi.importActual<typeof import('@treecrdt/wa-sqlite')>('@treecrdt/wa-sqlite')
  createTreecrdtClient.mockImplementation(actual.createTreecrdtClient)

  await treecrdtThoughtspace.init()
  await treecrdtThoughtspace.drop()
})

it('rejects queued startup writes when initialization fails and uses a fresh gate on retry', async () => {
  const initError = new Error('client initialization failed')
  createTreecrdtClient.mockRejectedValueOnce(initError)

  const treecrdtThoughtspace = createTreecrdtThoughtspace({
    client: { storage: 'memory', runtime: 'direct' },
    tabPolicy: 'multiple',
  })
  const queuedWrite = treecrdtThoughtspace.db.updateThoughts(emptyUpdates)
  const queuedWriteExpectation = expect(queuedWrite).rejects.toBe(initError)

  await expect(treecrdtThoughtspace.init()).rejects.toBe(initError)
  await queuedWriteExpectation

  const actual = await vi.importActual<typeof import('@treecrdt/wa-sqlite')>('@treecrdt/wa-sqlite')
  createTreecrdtClient.mockImplementation(actual.createTreecrdtClient)

  await treecrdtThoughtspace.init()
  await expect(treecrdtThoughtspace.db.updateThoughts(emptyUpdates)).resolves.toEqual([])
  await treecrdtThoughtspace.drop()
})

it('rejects queued startup writes on drop and creates a fresh gate for the next init', async () => {
  const treecrdtThoughtspace = createTreecrdtThoughtspace({
    client: { storage: 'memory', runtime: 'direct' },
    tabPolicy: 'multiple',
  })
  const queuedWrite = treecrdtThoughtspace.db.updateThoughts(emptyUpdates)
  const queuedWriteExpectation = expect(queuedWrite).rejects.toThrow('TreeCRDT session dropped before initialization.')

  await treecrdtThoughtspace.drop()
  await queuedWriteExpectation

  const actual = await vi.importActual<typeof import('@treecrdt/wa-sqlite')>('@treecrdt/wa-sqlite')
  createTreecrdtClient.mockImplementation(actual.createTreecrdtClient)

  await treecrdtThoughtspace.init()
  await expect(treecrdtThoughtspace.db.updateThoughts(emptyUpdates)).resolves.toEqual([])
  await treecrdtThoughtspace.drop()
})

it('detaches the provider and releases ownership through close when drop fails', async () => {
  const actual = await vi.importActual<typeof import('@treecrdt/wa-sqlite')>('@treecrdt/wa-sqlite')
  const client = await actual.createTreecrdtClient({
    storage: { type: 'memory' },
    runtime: { type: 'direct' },
  })
  const dropError = new Error('client drop failed')
  vi.spyOn(client, 'drop').mockRejectedValueOnce(dropError)
  const close = vi.spyOn(client, 'close')
  createTreecrdtClient.mockResolvedValueOnce(client).mockImplementation(actual.createTreecrdtClient)

  const treecrdtThoughtspace = createTreecrdtThoughtspace({
    client: { storage: 'memory', runtime: 'direct' },
    tabPolicy: 'multiple',
  })
  await treecrdtThoughtspace.init()
  await expect(treecrdtThoughtspace.drop()).rejects.toBe(dropError)
  expect(() => treecrdtThoughtspace.db.getThoughtById('missing' as never)).toThrow(
    'TreeCRDT DataProvider: init not called',
  )
  expect(close).toHaveBeenCalledTimes(1)

  await expect(treecrdtThoughtspace.init()).resolves.toEqual({ clientId: expect.any(String) })
  await treecrdtThoughtspace.drop()
})
