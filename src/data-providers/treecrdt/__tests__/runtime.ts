import { EM_TOKEN } from '../../../constants'
import createTreecrdtThoughtspace from '../runtime'

const { acquireTreecrdtSessionLock, createTreecrdtClient } = vi.hoisted(() => ({
  acquireTreecrdtSessionLock: vi.fn(),
  createTreecrdtClient: vi.fn(),
}))

vi.mock('../sessionLock', () => ({ default: acquireTreecrdtSessionLock }))
vi.mock('@treecrdt/wa-sqlite', async importOriginal => {
  const actual = await importOriginal<typeof import('@treecrdt/wa-sqlite')>()
  return { ...actual, createTreecrdtClient }
})

type TreecrdtModule = typeof import('@treecrdt/wa-sqlite')

let actualCreateTreecrdtClient!: TreecrdtModule['createTreecrdtClient']

const emptyUpdates = {
  thoughtIndexUpdates: {},
  lexemeIndexUpdates: {},
  lexemeIndexUpdatesOld: {},
  schemaVersion: 0,
}

/** Creates the standard in-memory thoughtspace used by lifecycle tests. */
const createMemoryThoughtspace = (docId?: string) =>
  createTreecrdtThoughtspace({
    client: {
      storage: 'memory',
      runtime: 'direct',
      ...(docId === undefined ? {} : { docId }),
    },
    tabPolicy: 'multiple',
  })

beforeAll(async () => {
  const actual = await vi.importActual<TreecrdtModule>('@treecrdt/wa-sqlite')
  actualCreateTreecrdtClient = actual.createTreecrdtClient
})

beforeEach(() => {
  createTreecrdtClient.mockImplementation(actualCreateTreecrdtClient)
})

afterEach(() => {
  acquireTreecrdtSessionLock.mockReset()
  createTreecrdtClient.mockReset()
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

it('maps em persistent storage to TreeCRDT OPFS client options', async () => {
  const stopAfterOptions = new Error('stop after capturing client options')
  createTreecrdtClient.mockRejectedValueOnce(stopAfterOptions)
  const treecrdtThoughtspace = createTreecrdtThoughtspace({
    client: {
      storage: 'persistent',
      runtime: 'dedicated-worker',
      docId: 'persistent-doc',
    },
    tabPolicy: 'single',
  })

  await expect(treecrdtThoughtspace.init()).rejects.toBe(stopAfterOptions)
  expect(createTreecrdtClient).toHaveBeenCalledWith({
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
  const treecrdtThoughtspace = createMemoryThoughtspace('memory-doc')

  expect(createTreecrdtClient).not.toHaveBeenCalled()
  await treecrdtThoughtspace.acquireAccess()
  expect(createTreecrdtClient).not.toHaveBeenCalled()

  await treecrdtThoughtspace.init()
  expect(createTreecrdtClient).toHaveBeenCalledTimes(1)
  expect(createTreecrdtClient).toHaveBeenCalledWith({
    storage: { type: 'memory' },
    runtime: { type: 'direct' },
    docId: 'memory-doc',
  })

  await treecrdtThoughtspace.drop()
})

it('coalesces concurrent initialization into one client', async () => {
  const treecrdtThoughtspace = createMemoryThoughtspace()
  const firstInit = treecrdtThoughtspace.init()
  const secondInit = treecrdtThoughtspace.init()

  await expect(Promise.all([firstInit, secondInit])).resolves.toHaveLength(2)
  expect(createTreecrdtClient).toHaveBeenCalledTimes(1)

  await treecrdtThoughtspace.drop()
})

it('serializes an in-flight init, drop, and following init', async () => {
  let releaseClient!: () => void
  let markClientStarted!: () => void
  const clientStarted = new Promise<void>(resolve => {
    markClientStarted = resolve
  })
  const clientReleased = new Promise<void>(resolve => {
    releaseClient = resolve
  })
  createTreecrdtClient.mockImplementationOnce(async options => {
    markClientStarted()
    await clientReleased
    return actualCreateTreecrdtClient(options)
  })

  const treecrdtThoughtspace = createMemoryThoughtspace()
  const firstInit = treecrdtThoughtspace.init()
  await clientStarted
  const drop = treecrdtThoughtspace.drop()
  const secondInit = treecrdtThoughtspace.init()

  expect(createTreecrdtClient).toHaveBeenCalledTimes(1)

  releaseClient()
  await Promise.all([firstInit, drop, secondInit])

  expect(createTreecrdtClient).toHaveBeenCalledTimes(2)
  await expect(treecrdtThoughtspace.db.getThoughtById(EM_TOKEN)).resolves.toMatchObject({ id: EM_TOKEN })

  await treecrdtThoughtspace.drop()
})

it('rejects queued startup writes when initialization fails and uses a fresh gate on retry', async () => {
  const initError = new Error('client initialization failed')
  createTreecrdtClient.mockRejectedValueOnce(initError)

  const treecrdtThoughtspace = createMemoryThoughtspace()
  const queuedWrite = treecrdtThoughtspace.db.updateThoughts(emptyUpdates)
  const queuedWriteExpectation = expect(queuedWrite).rejects.toBe(initError)

  await expect(treecrdtThoughtspace.init()).rejects.toBe(initError)
  await queuedWriteExpectation

  await treecrdtThoughtspace.init()
  await expect(treecrdtThoughtspace.db.updateThoughts(emptyUpdates)).resolves.toEqual([])
  await treecrdtThoughtspace.drop()
})

it('rejects writes queued before each settled drop and creates a fresh gate for init', async () => {
  const treecrdtThoughtspace = createMemoryThoughtspace()

  const firstWrite = treecrdtThoughtspace.db.updateThoughts(emptyUpdates)
  const firstWriteExpectation = expect(firstWrite).rejects.toThrow(
    'TreeCRDT client binding cleared before initialization.',
  )
  await Promise.all([treecrdtThoughtspace.drop(), firstWriteExpectation])

  const secondWrite = treecrdtThoughtspace.db.updateThoughts(emptyUpdates)
  const secondWriteExpectation = expect(secondWrite).rejects.toThrow(
    'TreeCRDT client binding cleared before initialization.',
  )
  await Promise.all([treecrdtThoughtspace.drop(), secondWriteExpectation])

  await treecrdtThoughtspace.init()
  await expect(treecrdtThoughtspace.db.updateThoughts(emptyUpdates)).resolves.toEqual([])
  await treecrdtThoughtspace.drop()
})

it('discards a terminal client when drop reports an error', async () => {
  const client = await actualCreateTreecrdtClient({
    storage: { type: 'memory' },
    runtime: { type: 'direct' },
  })
  const dropError = new Error('client drop failed')
  const originalDrop = client.drop.bind(client)
  // Model wa-sqlite 0.4: drop may report an error after making the client terminal.
  vi.spyOn(client, 'drop').mockImplementationOnce(async () => {
    await originalDrop()
    throw dropError
  })
  const close = vi.spyOn(client, 'close')
  createTreecrdtClient.mockResolvedValueOnce(client)

  const treecrdtThoughtspace = createMemoryThoughtspace()
  await treecrdtThoughtspace.init()
  await expect(treecrdtThoughtspace.drop()).rejects.toBe(dropError)
  expect(() => treecrdtThoughtspace.db.getThoughtById('missing' as never)).toThrow(
    'TreeCRDT DataProvider: init not called',
  )
  expect(close).not.toHaveBeenCalled()

  await expect(treecrdtThoughtspace.init()).resolves.toEqual({ clientId: expect.any(String) })
  await treecrdtThoughtspace.drop()
})
