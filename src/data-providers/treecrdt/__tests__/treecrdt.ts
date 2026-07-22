import { closeTreecrdt, initTreecrdt } from '../treecrdt'

const { closeClient, createTreecrdtClient } = vi.hoisted(() => ({
  closeClient: vi.fn(),
  createTreecrdtClient: vi.fn(),
}))

vi.mock('@treecrdt/wa-sqlite', () => ({ createTreecrdtClient }))

beforeEach(() => {
  createTreecrdtClient.mockResolvedValue({ close: closeClient })
})

afterEach(async () => {
  await closeTreecrdt()
  vi.clearAllMocks()
})

it('maps em in-memory storage to the TreeCRDT memory client', async () => {
  await initTreecrdt({
    storage: 'memory',
    runtime: 'direct',
    docId: 'memory-doc',
  })

  expect(createTreecrdtClient).toHaveBeenCalledWith({
    storage: { type: 'memory' },
    runtime: { type: 'direct' },
    docId: 'memory-doc',
  })
})

it('maps em persistent storage to TreeCRDT OPFS', async () => {
  await initTreecrdt({
    storage: 'persistent',
    runtime: 'dedicated-worker',
    docId: 'persistent-doc',
  })

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
