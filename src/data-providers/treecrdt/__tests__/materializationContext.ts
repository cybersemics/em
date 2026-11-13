import { createTreecrdtClient } from '@treecrdt/wa-sqlite'
import type ThoughtId from '../../../@types/ThoughtId'
import type Timestamp from '../../../@types/Timestamp'
import { EM_TOKEN, SETTINGS_TOKEN } from '../../../constants'
import hashThought from '../../../util/hashThought'
import type { ThoughtspaceMaterializationSnapshot } from '../../thoughtspace'
import { waitForMaterializedThoughtsToStore } from '../sync/materializationQueue'
import createTreecrdtDataProvider from '../thoughtspace'
import { withTreecrdtWriteBarrier } from '../writeBarrier'

const THOUGHT_ID = '00000000000000000000000000000201' as ThoughtId
const REPLICA_ID = new Uint8Array(32).fill(1)

/** Creates a minimal thought fixture. */
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

let client: Awaited<ReturnType<typeof createTreecrdtClient>>
let provider: ReturnType<typeof createTreecrdtDataProvider>
let close: () => Promise<void>
let snapshot: ThoughtspaceMaterializationSnapshot
const getSnapshot = vi.fn()
const apply = vi.fn()

beforeEach(async () => {
  client = await createTreecrdtClient({ docId: 'materialization-context' })
  provider = createTreecrdtDataProvider()
  snapshot = { thoughtIndex: {}, lexemeIndex: {} }
  getSnapshot.mockReset().mockImplementation(() => snapshot)
  apply.mockReset().mockImplementation(updates => {
    snapshot = {
      thoughtIndex: { ...snapshot.thoughtIndex, ...updates.thoughtIndex },
      lexemeIndex: { ...snapshot.lexemeIndex, ...updates.lexemeIndex },
    }
  })
  close = await provider.bindClient(client, REPLICA_ID, { getSnapshot, apply })
})

afterEach(async () => {
  await close()
  await waitForMaterializedThoughtsToStore()
  await client.drop()
})

it('publishes coalesced local events once without republishing local thoughts', async () => {
  await withTreecrdtWriteBarrier(async () => {
    await provider.db.updateThoughts({ thoughtIndexUpdates: { [THOUGHT_ID]: thought('a') } })
    await provider.db.updateThoughts({ thoughtIndexUpdates: { [THOUGHT_ID]: thought('b') } })
  })
  await waitForMaterializedThoughtsToStore()

  expect(apply).toHaveBeenCalledTimes(1)
  expect(apply.mock.calls[0][0].thoughtIndex).toEqual({})
  expect(snapshot.lexemeIndex[hashThought('b')].contexts).toEqual([THOUGHT_ID])

  apply.mockClear()
  // An order-only write produces an event, but must not republish unchanged memberships.
  await withTreecrdtWriteBarrier(() =>
    provider.db.updateThoughts({
      thoughtIndexUpdates: { [THOUGHT_ID]: thought('b') },
      movePlacements: { [THOUGHT_ID]: SETTINGS_TOKEN },
    }),
  )
  await waitForMaterializedThoughtsToStore()
  expect(apply).not.toHaveBeenCalled()
})

it('retries stale membership readback after a newer optimistic rename and persistence', async () => {
  // A round reads the store again after readback. A rename that lands there makes that readback stale.
  getSnapshot.mockImplementationOnce(() => snapshot)
  getSnapshot.mockImplementationOnce(() => {
    snapshot = { ...snapshot, thoughtIndex: { [THOUGHT_ID]: thought('b') } }
    void withTreecrdtWriteBarrier(() =>
      provider.db.updateThoughts({ thoughtIndexUpdates: { [THOUGHT_ID]: thought('b') } }),
    )
    return snapshot
  })
  await withTreecrdtWriteBarrier(() =>
    provider.db.updateThoughts({ thoughtIndexUpdates: { [THOUGHT_ID]: thought('a') } }),
  )
  await waitForMaterializedThoughtsToStore()

  expect(apply).toHaveBeenCalledTimes(1)
  expect(snapshot.lexemeIndex[hashThought('a')]).toBeUndefined()
  expect(snapshot.lexemeIndex[hashThought('b')].contexts).toEqual([THOUGHT_ID])
})

it('publishes pending memberships on the next edit after a failed publication', async () => {
  const report = vi.spyOn(console, 'error').mockImplementation(() => undefined)
  getSnapshot.mockImplementationOnce(() => {
    throw new Error('transient store read')
  })
  await withTreecrdtWriteBarrier(() =>
    provider.db.updateThoughts({ thoughtIndexUpdates: { [THOUGHT_ID]: thought('a') } }),
  )
  await expect(waitForMaterializedThoughtsToStore()).rejects.toThrow('transient store read')

  const laterThought = { ...thought('b'), id: '00000000000000000000000000000202' as ThoughtId }
  await withTreecrdtWriteBarrier(() =>
    provider.db.updateThoughts({ thoughtIndexUpdates: { [laterThought.id]: laterThought } }),
  )
  await waitForMaterializedThoughtsToStore()

  expect(snapshot.lexemeIndex[hashThought('a')]?.contexts).toEqual([THOUGHT_ID])
  expect(snapshot.lexemeIndex[hashThought('b')]?.contexts).toEqual([laterThought.id])
  report.mockRestore()
})

it('does not publish an old binding after the provider is reset during readback', async () => {
  getSnapshot.mockImplementationOnce(() => snapshot)
  getSnapshot.mockImplementationOnce(() => {
    provider.resetBinding(new Error('switch thoughtspace'))
    return snapshot
  })
  await withTreecrdtWriteBarrier(() =>
    provider.db.updateThoughts({ thoughtIndexUpdates: { [THOUGHT_ID]: thought('a') } }),
  )
  await waitForMaterializedThoughtsToStore()
  expect(apply).not.toHaveBeenCalled()
})

it('updates stored memberships on incoming deletion even when its thought was not loaded', async () => {
  await withTreecrdtWriteBarrier(() =>
    provider.db.updateThoughts({ thoughtIndexUpdates: { [THOUGHT_ID]: thought('a') } }),
  )
  await waitForMaterializedThoughtsToStore()
  snapshot = { thoughtIndex: {}, lexemeIndex: {} }
  await client.local.delete(new Uint8Array(32).fill(2), THOUGHT_ID)
  await waitForMaterializedThoughtsToStore()

  await expect(provider.db.getLexemeById(hashThought('a'))).resolves.toBeUndefined()
  // No deleted thought is loaded back into the view.
  expect(snapshot.thoughtIndex[THOUGHT_ID]).toBeNull()
})
