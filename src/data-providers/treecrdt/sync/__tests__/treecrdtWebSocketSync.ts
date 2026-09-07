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

it('isolates handles and local ops between thoughtspace instances', async () => {
  const firstHandle = createMockSyncHandle()
  const secondHandle = createMockSyncHandle()
  getTreecrdtSyncBaseUrl.mockReturnValue('https://sync.example.test')
  connectTreecrdtWebSocketSync.mockResolvedValueOnce(firstHandle).mockResolvedValueOnce(secondHandle)

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
  expect(firstHandle.pushLocalOps).toHaveBeenCalledWith([firstOp])
  expect(secondHandle.pushLocalOps).toHaveBeenCalledWith([secondOp])

  await first.stop()
  expect(firstHandle.close).toHaveBeenCalledTimes(1)
  expect(secondHandle.close).not.toHaveBeenCalled()

  await second.stop()
})
