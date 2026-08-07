import { EM_TOKEN } from '../../../constants'
import { tsid } from '../../thoughtspaceSession'
import createTreecrdtThoughtspace from '../runtime'

const { mockAcquireTreecrdtSessionLock, mockCreateTreecrdtClient } = vi.hoisted(() => ({
  mockAcquireTreecrdtSessionLock: vi.fn(),
  mockCreateTreecrdtClient: vi.fn(),
}))

vi.mock('../sessionLock', () => ({ default: mockAcquireTreecrdtSessionLock }))
vi.mock('@treecrdt/wa-sqlite', async importOriginal => {
  const actual = await importOriginal<typeof import('@treecrdt/wa-sqlite')>()
  return { ...actual, createTreecrdtClient: mockCreateTreecrdtClient }
})

type TreecrdtModule = typeof import('@treecrdt/wa-sqlite')

let createRealTreecrdtClient!: TreecrdtModule['createTreecrdtClient']

const emptyUpdates = {
  thoughtIndexUpdates: {},
  lexemeIndexUpdates: {},
  lexemeIndexUpdatesOld: {},
  schemaVersion: 0,
}

const memoryConfig = { storage: 'memory' } as const

beforeAll(async () => {
  const actual = await vi.importActual<TreecrdtModule>('@treecrdt/wa-sqlite')
  createRealTreecrdtClient = actual.createTreecrdtClient
})

beforeEach(() => {
  mockAcquireTreecrdtSessionLock.mockResolvedValue('acquired')
  mockCreateTreecrdtClient.mockImplementation(createRealTreecrdtClient)
})

afterEach(() => {
  mockAcquireTreecrdtSessionLock.mockReset()
  mockCreateTreecrdtClient.mockReset()
})

it.each([
  ['acquired', { status: 'acquired' }],
  ['unavailable', { status: 'blocked', reason: 'already-open' }],
  ['unsupported', { status: 'blocked', reason: 'unsupported' }],
] as const)('maps the %s session-lock status to thoughtspace access', async (lockStatus, access) => {
  mockAcquireTreecrdtSessionLock.mockResolvedValue(lockStatus)
  const treecrdtThoughtspace = createTreecrdtThoughtspace()

  await expect(treecrdtThoughtspace.acquireAccess()).resolves.toEqual(access)
  expect(mockAcquireTreecrdtSessionLock).toHaveBeenCalledWith()
})

it('rejects a different storage until drop and accepts it afterward', async () => {
  const treecrdtThoughtspace = createTreecrdtThoughtspace()

  await treecrdtThoughtspace.init(memoryConfig)
  await expect(treecrdtThoughtspace.init({ storage: 'persistent' })).rejects.toThrow(
    'TreeCRDT storage cannot change before the thoughtspace is dropped.',
  )
  expect(mockCreateTreecrdtClient).toHaveBeenCalledTimes(1)

  await treecrdtThoughtspace.drop()
  const stopAfterDrop = new Error('stop after drop')
  mockCreateTreecrdtClient.mockRejectedValueOnce(stopAfterDrop)
  await expect(treecrdtThoughtspace.init({ storage: 'persistent' })).rejects.toBe(stopAfterDrop)
  expect(mockCreateTreecrdtClient).toHaveBeenCalledTimes(2)
})

it('maps em persistent storage to TreeCRDT OPFS client options', async () => {
  const stopAfterOptions = new Error('stop after capturing client options')
  mockCreateTreecrdtClient.mockRejectedValueOnce(stopAfterOptions)
  const treecrdtThoughtspace = createTreecrdtThoughtspace()

  await expect(
    treecrdtThoughtspace.init({
      storage: 'persistent',
    }),
  ).rejects.toBe(stopAfterOptions)
  expect(mockCreateTreecrdtClient).toHaveBeenCalledWith({
    storage: {
      type: 'opfs',
      filename: `/treecrdt-em-${tsid}.db`,
      fallback: 'throw',
    },
    runtime: { type: 'dedicated-worker' },
    docId: tsid,
  })
})

it('creates the client lazily', async () => {
  const treecrdtThoughtspace = createTreecrdtThoughtspace()

  expect(mockCreateTreecrdtClient).not.toHaveBeenCalled()
  await treecrdtThoughtspace.acquireAccess()
  expect(mockCreateTreecrdtClient).not.toHaveBeenCalled()

  await treecrdtThoughtspace.init(memoryConfig)
  expect(mockCreateTreecrdtClient).toHaveBeenCalledTimes(1)
  expect(mockCreateTreecrdtClient).toHaveBeenCalledWith({
    storage: { type: 'memory' },
    runtime: { type: 'direct' },
    docId: tsid,
  })

  await treecrdtThoughtspace.drop()
})

it('coalesces concurrent initialization into one client', async () => {
  const treecrdtThoughtspace = createTreecrdtThoughtspace()
  const firstInit = treecrdtThoughtspace.init(memoryConfig)
  const secondInit = treecrdtThoughtspace.init(memoryConfig)

  await expect(Promise.all([firstInit, secondInit])).resolves.toHaveLength(2)
  expect(mockCreateTreecrdtClient).toHaveBeenCalledTimes(1)

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
  mockCreateTreecrdtClient.mockImplementationOnce(async options => {
    markClientStarted()
    await clientReleased
    return createRealTreecrdtClient(options)
  })

  const treecrdtThoughtspace = createTreecrdtThoughtspace()
  const firstInit = treecrdtThoughtspace.init(memoryConfig)
  await clientStarted
  const drop = treecrdtThoughtspace.drop()
  const secondInit = treecrdtThoughtspace.init(memoryConfig)

  expect(mockCreateTreecrdtClient).toHaveBeenCalledTimes(1)

  releaseClient()
  await Promise.all([firstInit, drop, secondInit])

  expect(mockCreateTreecrdtClient).toHaveBeenCalledTimes(2)
  await expect(treecrdtThoughtspace.db.getThoughtById(EM_TOKEN)).resolves.toMatchObject({ id: EM_TOKEN })

  await treecrdtThoughtspace.drop()
})

it('rejects queued startup writes when initialization fails and uses a fresh gate on retry', async () => {
  const initError = new Error('client initialization failed')
  mockCreateTreecrdtClient.mockRejectedValueOnce(initError)

  const treecrdtThoughtspace = createTreecrdtThoughtspace()
  const queuedWrite = treecrdtThoughtspace.db.updateThoughts(emptyUpdates)
  const queuedWriteExpectation = expect(queuedWrite).rejects.toBe(initError)

  await expect(treecrdtThoughtspace.init(memoryConfig)).rejects.toBe(initError)
  await queuedWriteExpectation

  await treecrdtThoughtspace.init(memoryConfig)
  await expect(treecrdtThoughtspace.db.updateThoughts(emptyUpdates)).resolves.toEqual([])
  await treecrdtThoughtspace.drop()
})

it('rejects writes queued before each settled drop and creates a fresh gate for init', async () => {
  const treecrdtThoughtspace = createTreecrdtThoughtspace()

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

  await treecrdtThoughtspace.init(memoryConfig)
  await expect(treecrdtThoughtspace.db.updateThoughts(emptyUpdates)).resolves.toEqual([])
  await treecrdtThoughtspace.drop()
})

it('discards a terminal client when drop reports an error', async () => {
  const client = await createRealTreecrdtClient({
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
  mockCreateTreecrdtClient.mockResolvedValueOnce(client)

  const treecrdtThoughtspace = createTreecrdtThoughtspace()
  await treecrdtThoughtspace.init(memoryConfig)
  await expect(treecrdtThoughtspace.drop()).rejects.toBe(dropError)
  expect(() => treecrdtThoughtspace.db.getThoughtById('missing' as never)).toThrow(
    'TreeCRDT DataProvider: init not called',
  )
  expect(close).not.toHaveBeenCalled()

  await expect(treecrdtThoughtspace.init(memoryConfig)).resolves.toEqual({ clientId: expect.any(String) })
  await treecrdtThoughtspace.drop()
})
