import { hexToBytes, nodeIdToBytes16 } from '@treecrdt/interface/ids'
import { type TreecrdtClient, createTreecrdtClient } from '@treecrdt/wa-sqlite'
import type ThoughtId from '../../../@types/ThoughtId'
import type Timestamp from '../../../@types/Timestamp'
import { EM_TOKEN } from '../../../constants'
import deferred from '../../../test-helpers/deferred'
import hashThought from '../../../util/hashThought'
import { encodeThoughtPayload } from '../payload'
import createTreecrdtDataProvider from '../thoughtspace'

const THOUGHT_ID = '00000000000000000000000000000201' as ThoughtId
const replica = new Uint8Array(32).fill(1)
let clientOne: TreecrdtClient
let clientTwo: TreecrdtClient
let bindings: Awaited<ReturnType<ReturnType<typeof createTreecrdtDataProvider>['bindClient']>>[]

/** Creates a complete thought for provider contract tests. */
const thought = (value: string) => ({
  id: THOUGHT_ID,
  parentId: EM_TOKEN,
  value,
  rank: 0,
  childrenMap: {},
  created: 1 as Timestamp,
  lastUpdated: 1 as Timestamp,
  updatedBy: 'test',
})

beforeEach(async () => {
  clientOne = await createTreecrdtClient({ storage: { type: 'memory' }, runtime: { type: 'direct' } })
  clientTwo = await createTreecrdtClient({ storage: { type: 'memory' }, runtime: { type: 'direct' } })
  bindings = []
})

afterEach(async () => {
  await Promise.all(bindings.map(binding => binding.unsubscribe()))
  await Promise.all([clientOne.drop(), clientTwo.drop()])
  vi.restoreAllMocks()
})

it('retains the originating client and bridge for work queued before rebinding', async () => {
  const provider = createTreecrdtDataProvider()
  const bridgeOne = { getSnapshot: () => ({ generation: 0, thoughtIndex: {}, lexemeIndex: {} }), apply: vi.fn() }
  const bridgeTwo = { getSnapshot: () => ({ generation: 0, thoughtIndex: {}, lexemeIndex: {} }), apply: vi.fn() }
  bindings.push(await provider.bindClient(clientOne, replica, bridgeOne))
  const started = deferred()
  const released = deferred()
  const parent = clientOne.tree.parent.bind(clientOne.tree)
  vi.spyOn(clientOne.tree, 'parent').mockImplementationOnce(async id => {
    started.resolve()
    await released.promise
    return parent(id)
  })

  const first = provider.db.updateThoughts({ thoughtIndexUpdates: { [THOUGHT_ID]: thought('client one') } })
  await started.promise
  provider.resetBinding(new Error('switch client binding'))
  bindings.push(await provider.bindClient(clientTwo, replica, bridgeTwo))
  const second = provider.db.updateThoughts({ thoughtIndexUpdates: { [THOUGHT_ID]: thought('client two') } })
  released.resolve()
  await Promise.all([first, second])

  expect(bridgeOne.apply).toHaveBeenCalledWith(
    expect.objectContaining({ thoughtIndex: expect.objectContaining({ [THOUGHT_ID]: thought('client one') }) }),
  )
  expect(bridgeTwo.apply).toHaveBeenCalledWith(
    expect.objectContaining({ thoughtIndex: expect.objectContaining({ [THOUGHT_ID]: thought('client two') }) }),
  )
  await expect(provider.db.getThoughtById(THOUGHT_ID)).resolves.toEqual(thought('client two'))
})

it('publishes coherent local and incoming commits before draining a closed binding', async () => {
  const provider = createTreecrdtDataProvider()
  const published: { value: string; contexts: ThoughtId[] | undefined }[] = []
  const binding = await provider.bindClient(clientOne, replica, {
    getSnapshot: () => ({ generation: 0, thoughtIndex: {}, lexemeIndex: {} }),
    apply: ({ thoughtIndex, lexemeIndex }) => {
      const value = thoughtIndex[THOUGHT_ID]!.value
      published.push({ value, contexts: lexemeIndex[hashThought(value)]?.contexts })
    },
  })
  bindings.push(binding)
  await provider.db.updateThoughts({ thoughtIndexUpdates: { [THOUGHT_ID]: thought('cat') } })
  const started = deferred()
  const released = deferred()
  const getText = clientOne.runner.getText.bind(clientOne.runner)
  let pauseRead = true
  vi.spyOn(clientOne.runner, 'getText').mockImplementation(async (sql, params) => {
    const result = await getText(sql, params)
    if (pauseRead && sql.includes('FROM (SELECT * FROM em_lexeme_memberships')) {
      pauseRead = false
      started.resolve()
      await released.promise
    }
    return result
  })

  const local = provider.db.updateThoughts({ thoughtIndexUpdates: { [THOUGHT_ID]: thought('dog') } })
  await started.promise
  await clientTwo.ops.appendMany(await clientOne.ops.all())
  const operation = await clientTwo.local.payload(
    new Uint8Array(32).fill(2),
    THOUGHT_ID,
    encodeThoughtPayload(thought('bird')),
  )
  const incoming = binding.syncClient.ops.appendMany([operation])
  const read = provider.db.getThoughtById(THOUGHT_ID)
  // Let the public read enter its bound queue before closing admission.
  await Promise.resolve()
  const closed = binding.unsubscribe()
  released.resolve()
  await Promise.all([local, incoming, closed])

  expect(published).toEqual([
    { value: 'cat', contexts: [THOUGHT_ID] },
    { value: 'dog', contexts: [THOUGHT_ID] },
    { value: 'bird', contexts: [THOUGHT_ID] },
  ])
  await expect(read).resolves.toEqual(thought('bird'))
  await expect(binding.syncClient.ops.appendMany([operation])).rejects.toThrow('binding is closed')
})

it.each([
  ['sync', true],
  ['provider', true],
  ['provider', false],
] as const)('finishes derived indexes after %s read-path recovery (UI bridge: %s)', async (entry, withBridge) => {
  const provider = createTreecrdtDataProvider()
  const bridge = { getSnapshot: () => ({ generation: 0, thoughtIndex: {}, lexemeIndex: {} }), apply: vi.fn() }
  const binding = await provider.bindClient(clientOne, replica, withBridge ? bridge : undefined)
  bindings.push(binding)
  await provider.db.updateThoughts({ thoughtIndexUpdates: { [THOUGHT_ID]: thought('cat') } })
  await clientTwo.ops.appendMany(await clientOne.ops.all())
  const payload = encodeThoughtPayload(thought('=pin'))
  const operation = await clientTwo.local.payload(new Uint8Array(32).fill(2), THOUGHT_ID, payload)
  const { id, lamport } = operation.meta
  const opRef = await clientTwo.runner.getText('SELECT hex(op_ref) FROM ops WHERE replica = ?1 AND counter = ?2', [
    id.replica,
    id.counter,
  ])
  // Arrange a recoverable interruption: a valid operation reached the log but not materialized state.
  await clientOne.runner.getText(
    "INSERT INTO ops (replica, counter, lamport, kind, node, payload, op_ref) VALUES (?1, ?2, ?3, 'payload', ?4, ?5, ?6)",
    [id.replica, id.counter, lamport, nodeIdToBytes16(THOUGHT_ID), payload, hexToBytes(opRef!)],
  )
  await clientOne.runner.exec(
    "UPDATE tree_meta SET replay_lamport = 0, replay_replica = X'', replay_counter = 0 WHERE id = 1",
  )

  if (entry === 'sync') await binding.syncClient.opRefs.all()
  const parent = await provider.db.getThoughtById(EM_TOKEN)

  expect(parent).toMatchObject({
    childrenMap: { '=pin': THOUGHT_ID },
  })
  await expect(provider.db.getLexemeById(hashThought('=pin'))).resolves.toMatchObject({ contexts: [THOUGHT_ID] })
  await expect(provider.db.getLexemeById(hashThought('cat'))).resolves.toBeUndefined()
})
