import type { Operation } from '@treecrdt/interface'
import type { TreecrdtClient } from '@treecrdt/wa-sqlite'
import createTreecrdtWebSocketSync from '../treecrdtWebSocketSync'

const { connectTreecrdtWebSocketSync, getTreecrdtSyncBaseUrl } = vi.hoisted(() => ({
  connectTreecrdtWebSocketSync: vi.fn(),
  getTreecrdtSyncBaseUrl: vi.fn(),
}))

vi.mock('@treecrdt/sync', () => ({ connectTreecrdtWebSocketSync }))
vi.mock('../config', () => ({ getTreecrdtSyncBaseUrl }))

/** Creates a minimal WebSocket sync handle for lifecycle assertions. */
const createMockSyncHandle = () => ({
  close: vi.fn().mockResolvedValue(undefined),
  pushLocalOps: vi.fn().mockResolvedValue(undefined),
  startLive: vi.fn().mockResolvedValue(undefined),
  syncOnce: vi.fn().mockResolvedValue(undefined),
})

type MockSyncHandle = ReturnType<typeof createMockSyncHandle>

let handles: MockSyncHandle[] = []

beforeEach(() => {
  handles = []
  getTreecrdtSyncBaseUrl.mockReturnValue('https://sync.example.test')
  connectTreecrdtWebSocketSync.mockImplementation(async () => {
    const handle = createMockSyncHandle()
    handles.push(handle)
    return handle
  })
})

afterEach(() => {
  vi.clearAllMocks()
})

it('isolates handles and local ops between thoughtspace instances', async () => {
  const first = createTreecrdtWebSocketSync()
  const second = createTreecrdtWebSocketSync()
  const firstClient = {} as TreecrdtClient
  const secondClient = {} as TreecrdtClient
  const firstOp = {} as Operation
  const secondOp = {} as Operation

  await first.start(firstClient)
  await second.start(secondClient)
  await first.pushLocalOps([firstOp])
  await second.pushLocalOps([secondOp])

  expect(connectTreecrdtWebSocketSync).toHaveBeenNthCalledWith(1, firstClient, expect.any(Object))
  expect(connectTreecrdtWebSocketSync).toHaveBeenNthCalledWith(2, secondClient, expect.any(Object))
  expect(handles[0].pushLocalOps).toHaveBeenCalledWith([firstOp])
  expect(handles[1].pushLocalOps).toHaveBeenCalledWith([secondOp])

  await first.stop()
  expect(handles[0].close).toHaveBeenCalledTimes(1)
  expect(handles[1].close).not.toHaveBeenCalled()

  await second.stop()
})

it('discards buffered ops when the owning thoughtspace stops', async () => {
  const sync = createTreecrdtWebSocketSync()

  await sync.pushLocalOps([{} as Operation])
  await sync.stop()
  await sync.start({} as TreecrdtClient)

  expect(handles[0].pushLocalOps).not.toHaveBeenCalled()

  await sync.stop()
})

it('flushes ops buffered before the WebSocket handle is ready', async () => {
  const sync = createTreecrdtWebSocketSync()
  const op = {} as Operation

  await sync.pushLocalOps([op])
  await sync.start({} as TreecrdtClient)

  expect(handles[0].pushLocalOps).toHaveBeenCalledWith([op])

  await sync.stop()
})
