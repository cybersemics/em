import { hexToBytes, nodeIdToBytes16 } from '@treecrdt/interface/ids'
import { type TreecrdtClient, createTreecrdtClient } from '@treecrdt/wa-sqlite'
import type ThoughtId from '../../../@types/ThoughtId'
import type Timestamp from '../../../@types/Timestamp'
import { EM_TOKEN, HOME_TOKEN } from '../../../constants'
import deferred from '../../../test-helpers/deferred'
import hashThought from '../../../util/hashThought'
import { encodeThoughtPayload } from '../payload'
import createTreecrdtDataProvider from '../thoughtspace'
import { waitForTreecrdtWriteBarrier } from '../writeBarrier'

const THOUGHT_ID = '00000000000000000000000000000201' as ThoughtId
const replica = new Uint8Array(32).fill(1)
let clientOne: TreecrdtClient
let clientTwo: TreecrdtClient
let bindings: Awaited<ReturnType<ReturnType<typeof createTreecrdtDataProvider>['bindClient']>>[]

/** Creates a complete thought for provider contract tests. */
const thought = (value: string, id = THOUGHT_ID) => ({
  id,
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
  await Promise.all(bindings.map(binding => binding.closeBinding()))
  await Promise.all([clientOne.drop(), clientTwo.drop()])
  vi.restoreAllMocks()
})

it('reads final memberships once for a multi-batch write and its publication', async () => {
  const provider = createTreecrdtDataProvider()
  const bridge = { getGeneration: () => 0, onCommit: vi.fn() }
  bindings.push(await provider.bindClient(clientOne, replica, bridge))
  await provider.db.updateThoughts({ thoughtIndexUpdates: { [THOUGHT_ID]: thought('cat') } })
  const secondId = '00000000000000000000000000000202' as ThoughtId
  const getText = vi.spyOn(clientOne.runner, 'getText')
  bridge.onCommit.mockClear()

  const results = await provider.persistPushQueueBatches([
    { thoughtIndexUpdates: { [THOUGHT_ID]: { value: 'dog' } } },
    { thoughtIndexUpdates: { [secondId]: thought('dog', secondId) } },
  ])

  expect(results[0].lexemeIndex).toEqual({
    [hashThought('cat')]: null,
    [hashThought('dog')]: { contexts: [THOUGHT_ID, secondId], created: 1, lastUpdated: 1, updatedBy: 'test' },
  })
  expect(results[1].lexemeIndex).toBe(results[0].lexemeIndex)
  expect(bridge.onCommit).toHaveBeenCalledOnce()
  expect(bridge.onCommit.mock.calls[0][0].lexemeIndex).toEqual(results[0].lexemeIndex)
  expect(getText.mock.calls.filter(([sql]) => sql.includes('FROM (SELECT * FROM em_lexeme_memberships'))).toHaveLength(
    1,
  )
})

it('renames without reading child lists when no view needs publication', async () => {
  const provider = createTreecrdtDataProvider()
  bindings.push(await provider.bindClient(clientOne, replica))
  await provider.db.updateThoughts({ thoughtIndexUpdates: { [THOUGHT_ID]: thought('cat') } })
  const children = vi.spyOn(clientOne.tree, 'children')

  const result = await provider.db.updateThoughts({ thoughtIndexUpdates: { [THOUGHT_ID]: { value: 'dog' } } })

  expect(result.lexemeIndex[hashThought('dog')]).toMatchObject({ contexts: [THOUGHT_ID] })
  expect(children).not.toHaveBeenCalled()
  await expect(provider.db.getThoughtById(THOUGHT_ID)).resolves.toEqual(thought('dog'))
})

it('reads sibling order once for placement and once for the committed refresh', async () => {
  const provider = createTreecrdtDataProvider()
  const bridge = { getGeneration: () => 0, onCommit: vi.fn() }
  bindings.push(await provider.bindClient(clientOne, replica, bridge))
  const secondId = '00000000000000000000000000000202' as ThoughtId
  const thirdId = '00000000000000000000000000000203' as ThoughtId
  await provider.db.updateThoughts({
    thoughtIndexUpdates: {
      [THOUGHT_ID]: { ...thought('a'), parentId: HOME_TOKEN },
      [secondId]: { ...thought('b', secondId), parentId: HOME_TOKEN, rank: 1 },
      [thirdId]: { ...thought('c', thirdId), parentId: HOME_TOKEN, rank: 2 },
    },
  })
  const children = vi.spyOn(clientOne.tree, 'children')
  const getPayload = vi.spyOn(clientOne.tree, 'getPayload')
  bridge.onCommit.mockClear()

  await provider.db.updateThoughts({
    thoughtIndexUpdates: { [THOUGHT_ID]: { parentId: HOME_TOKEN } },
    movePlacements: { [THOUGHT_ID]: thirdId },
  })

  expect(children.mock.calls.filter(([id]) => id === HOME_TOKEN)).toHaveLength(2)
  // One existing payload read, one membership refresh, and four published thoughts.
  expect(getPayload).toHaveBeenCalledTimes(6)
  expect(bridge.onCommit).toHaveBeenCalledOnce()
  expect(Object.values(bridge.onCommit.mock.calls[0][0].thoughtIndex[HOME_TOKEN].childrenMap)).toEqual([
    secondId,
    thirdId,
    THOUGHT_ID,
  ])
  expect(bridge.onCommit.mock.calls[0][0].thoughtIndex).toMatchObject({
    [THOUGHT_ID]: { rank: 2 },
    [secondId]: { rank: 0 },
    [thirdId]: { rank: 1 },
  })
})

it('publishes a partially applied batch without confirming the failed write', async () => {
  const provider = createTreecrdtDataProvider()
  const bridge = { getGeneration: () => 0, onCommit: vi.fn() }
  bindings.push(await provider.bindClient(clientOne, replica, bridge))
  const missingId = '00000000000000000000000000000202' as ThoughtId

  await expect(
    provider.db.updateThoughts({
      thoughtIndexUpdates: { [THOUGHT_ID]: thought('=pin'), [missingId]: { value: 'incomplete' } },
      writeId: 'generation:0:partial',
    }),
  ).rejects.toThrow(`Cannot apply an edit to missing thought ${missingId}.`)
  await expect(waitForTreecrdtWriteBarrier()).rejects.toThrow(`Cannot apply an edit to missing thought ${missingId}.`)

  expect(bridge.onCommit).toHaveBeenCalledOnce()
  expect(bridge.onCommit.mock.calls[0][0]).toMatchObject({
    thoughtIndex: { [THOUGHT_ID]: thought('=pin'), [EM_TOKEN]: { childrenMap: { '=pin': THOUGHT_ID } } },
    lexemeIndex: { [hashThought('=pin')]: { contexts: [THOUGHT_ID] } },
    writeIds: undefined,
  })
  await expect(provider.db.getThoughtById(missingId)).resolves.toBeUndefined()
})

it.each([true, false])('maintains attribute children across batched writes (UI bridge: %s)', async withBridge => {
  const provider = createTreecrdtDataProvider()
  const bridge = { getGeneration: () => 0, onCommit: vi.fn() }
  bindings.push(await provider.bindClient(clientOne, replica, withBridge ? bridge : undefined))
  const parentId = '00000000000000000000000000000202' as ThoughtId
  await provider.db.updateThoughts({
    thoughtIndexUpdates: { [THOUGHT_ID]: thought('=pin'), [parentId]: { ...thought('parent', parentId), rank: 1 } },
  })
  await expect(provider.db.getThoughtById(EM_TOKEN)).resolves.toMatchObject({
    childrenMap: { '=pin': THOUGHT_ID, [parentId]: parentId },
  })

  const results = await provider.persistPushQueueBatches([
    { thoughtIndexUpdates: { [THOUGHT_ID]: { value: 'plain' } } },
    { thoughtIndexUpdates: { [THOUGHT_ID]: { parentId } }, movePlacements: { [THOUGHT_ID]: null } },
    { thoughtIndexUpdates: { [THOUGHT_ID]: { value: '=archive' } } },
  ])

  await expect(provider.db.getThoughtById(parentId)).resolves.toMatchObject({ childrenMap: { '=archive': THOUGHT_ID } })
  expect((await provider.db.getThoughtById(EM_TOKEN))!.childrenMap).not.toHaveProperty('=pin')
  expect(results.at(-1)!.lexemeIndex).toMatchObject({
    [hashThought('=pin')]: null,
    [hashThought('plain')]: null,
    [hashThought('=archive')]: { contexts: [THOUGHT_ID] },
  })

  await provider.db.updateThoughts({ thoughtIndexUpdates: { [THOUGHT_ID]: null } })
  await expect(provider.db.getThoughtById(parentId)).resolves.toMatchObject({ childrenMap: {} })
})

it('finishes both indexes without publishing a write invalidated during indexing', async () => {
  const provider = createTreecrdtDataProvider()
  let generation = 0
  const onCommit = vi.fn()
  bindings.push(await provider.bindClient(clientOne, replica, { getGeneration: () => generation, onCommit }))
  const started = deferred()
  const released = deferred()
  const exec = clientOne.runner.exec.bind(clientOne.runner)
  vi.spyOn(clientOne.runner, 'exec').mockImplementation(async sql => {
    if (sql.startsWith('INSERT INTO em_attribute_children ')) {
      started.resolve()
      await released.promise
    }
    return exec(sql)
  })

  const write = provider.db.updateThoughts({
    thoughtIndexUpdates: { [THOUGHT_ID]: thought('=pin') },
    writeId: 'generation:0:attribute',
  })
  await started.promise
  generation += 1
  const read = provider.db.getThoughtById(EM_TOKEN)
  released.resolve()
  const result = await write

  expect(onCommit).not.toHaveBeenCalled()
  expect(result.lexemeIndex[hashThought('=pin')]).toMatchObject({ contexts: [THOUGHT_ID] })
  await expect(read).resolves.toMatchObject({ childrenMap: { '=pin': THOUGHT_ID } })
})

it('retains the originating client and bridge for work queued before rebinding', async () => {
  const provider = createTreecrdtDataProvider()
  const bridgeOne = { getGeneration: () => 0, onCommit: vi.fn() }
  const bridgeTwo = { getGeneration: () => 0, onCommit: vi.fn() }
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

  expect(bridgeOne.onCommit).toHaveBeenCalledWith(
    expect.objectContaining({ thoughtIndex: expect.objectContaining({ [THOUGHT_ID]: thought('client one') }) }),
  )
  expect(bridgeTwo.onCommit).toHaveBeenCalledWith(
    expect.objectContaining({ thoughtIndex: expect.objectContaining({ [THOUGHT_ID]: thought('client two') }) }),
  )
  await expect(provider.db.getThoughtById(THOUGHT_ID)).resolves.toEqual(thought('client two'))
})

it('publishes coherent local and incoming commits before draining a closed binding', async () => {
  const provider = createTreecrdtDataProvider()
  const published: { value: string; contexts: ThoughtId[] | undefined }[] = []
  const binding = await provider.bindClient(clientOne, replica, {
    getGeneration: () => 0,
    onCommit: ({ thoughtIndex, lexemeIndex }) => {
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
  const closed = binding.closeBinding()
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

it('discards an incoming publication when the receiving view resets during its read', async () => {
  const provider = createTreecrdtDataProvider()
  let generation = 0
  const onCommit = vi.fn()
  const binding = await provider.bindClient(clientOne, replica, { getGeneration: () => generation, onCommit })
  bindings.push(binding)
  await provider.db.updateThoughts({ thoughtIndexUpdates: { [THOUGHT_ID]: thought('cat') } })
  await clientTwo.ops.appendMany(await clientOne.ops.all())
  const operation = await clientTwo.local.payload(
    new Uint8Array(32).fill(2),
    THOUGHT_ID,
    encodeThoughtPayload(thought('dog')),
  )
  onCommit.mockClear()
  const started = deferred()
  const released = deferred()
  const getText = clientOne.runner.getText.bind(clientOne.runner)
  vi.spyOn(clientOne.runner, 'getText').mockImplementation(async (sql, params) => {
    const result = await getText(sql, params)
    if (sql.includes('FROM (SELECT * FROM em_lexeme_memberships')) {
      started.resolve()
      await released.promise
    }
    return result
  })

  const incoming = binding.syncClient.ops.appendMany([operation])
  await started.promise
  generation += 1
  released.resolve()
  await incoming

  expect(onCommit).not.toHaveBeenCalled()
  await expect(provider.db.getLexemeById(hashThought('dog'))).resolves.toMatchObject({ contexts: [THOUGHT_ID] })
})

it.each([
  ['sync', true],
  ['provider', true],
  ['provider', false],
] as const)('finishes derived indexes after %s read-path recovery (UI bridge: %s)', async (entry, withBridge) => {
  const provider = createTreecrdtDataProvider()
  const bridge = { getGeneration: () => 0, onCommit: vi.fn() }
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
