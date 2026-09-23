import type { MaterializationEvent } from '@treecrdt/interface/engine'
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

/** Pauses an asynchronous boundary until the test releases it. */
const deferred = () => {
  let resolve!: () => void
  const promise = new Promise<void>(done => {
    resolve = done
  })
  return { promise, resolve }
}

let client: Awaited<ReturnType<typeof createTreecrdtClient>>
let provider: ReturnType<typeof createTreecrdtDataProvider>
let close: () => Promise<void>
let snapshot: ThoughtspaceMaterializationSnapshot
const apply = vi.fn()

beforeEach(async () => {
  client = await createTreecrdtClient({ storage: { type: 'memory' }, runtime: { type: 'direct' } })
  provider = createTreecrdtDataProvider()
  snapshot = { thoughtIndex: {}, lexemeIndex: {} }
  apply.mockReset().mockImplementation(updates => {
    snapshot = {
      thoughtIndex: { ...snapshot.thoughtIndex, ...updates.thoughtIndex },
      lexemeIndex: { ...snapshot.lexemeIndex, ...updates.lexemeIndex },
    }
  })
  close = await provider.bindClient(client, REPLICA_ID, { getSnapshot: () => snapshot, apply })
})

afterEach(async () => {
  await close()
  await waitForMaterializedThoughtsToStore()
  await client.drop()
})

it('coalesces local events into one membership read without reading back local thoughts', async () => {
  const reader = vi.spyOn(client.runner, 'getText')
  const readPayload = vi.spyOn(client.tree, 'getPayload')
  await withTreecrdtWriteBarrier(async () => {
    await provider.db.updateThoughts({ thoughtIndexUpdates: { [THOUGHT_ID]: thought('a') } })
    await provider.db.updateThoughts({ thoughtIndexUpdates: { [THOUGHT_ID]: thought('b') } })
  })
  readPayload.mockClear()
  await waitForMaterializedThoughtsToStore()

  expect(reader.mock.calls.filter(([sql]) => sql.includes("'key', lexeme_hash"))).toHaveLength(1)
  expect(readPayload).not.toHaveBeenCalled()
  expect(apply).toHaveBeenCalledTimes(1)
  expect(apply.mock.calls[0][0].thoughtIndex).toEqual({})
  expect(snapshot.lexemeIndex[hashThought('b')].contexts).toEqual([THOUGHT_ID])

  apply.mockClear()
  reader.mockClear()
  // An order-only write produces an event, but must not read, write, or republish unchanged memberships.
  await withTreecrdtWriteBarrier(() =>
    provider.db.updateThoughts({
      thoughtIndexUpdates: { [THOUGHT_ID]: thought('b') },
      movePlacements: { [THOUGHT_ID]: SETTINGS_TOKEN },
    }),
  )
  await waitForMaterializedThoughtsToStore()
  expect(reader.mock.calls.filter(([sql]) => sql.includes('em_lexeme_memberships'))).toHaveLength(0)
  expect(apply).not.toHaveBeenCalled()
})

it('retries stale membership readback after a newer optimistic rename and persistence', async () => {
  const reading = deferred()
  const release = deferred()
  const getText = client.runner.getText.bind(client.runner)
  vi.spyOn(client.runner, 'getText').mockImplementation(async (sql, params) => {
    const result = await getText(sql, params)
    if (sql.includes("'key', lexeme_hash")) {
      reading.resolve()
      await release.promise
    }
    return result
  })
  await withTreecrdtWriteBarrier(() =>
    provider.db.updateThoughts({ thoughtIndexUpdates: { [THOUGHT_ID]: thought('a') } }),
  )
  await reading.promise

  snapshot = { ...snapshot, thoughtIndex: { [THOUGHT_ID]: thought('b') } }
  await withTreecrdtWriteBarrier(() =>
    provider.db.updateThoughts({ thoughtIndexUpdates: { [THOUGHT_ID]: thought('b') } }),
  )
  release.resolve()
  await waitForMaterializedThoughtsToStore()

  expect(apply).toHaveBeenCalledTimes(1)
  expect(snapshot.lexemeIndex[hashThought('a')]).toBeUndefined()
  expect(snapshot.lexemeIndex[hashThought('b')].contexts).toEqual([THOUGHT_ID])
  expect(snapshot.thoughtIndex[THOUGHT_ID].value).toBe('b')
})

it('does not publish an old binding after the provider is reset during readback', async () => {
  const reading = deferred()
  const release = deferred()
  const getText = client.runner.getText.bind(client.runner)
  vi.spyOn(client.runner, 'getText').mockImplementation(async (sql, params) => {
    const result = await getText(sql, params)
    if (sql.includes("'key', lexeme_hash")) {
      reading.resolve()
      await release.promise
    }
    return result
  })
  await withTreecrdtWriteBarrier(() =>
    provider.db.updateThoughts({ thoughtIndexUpdates: { [THOUGHT_ID]: thought('a') } }),
  )
  await reading.promise
  provider.resetBinding(new Error('switch thoughtspace'))
  await close()
  release.resolve()
  await waitForMaterializedThoughtsToStore()
  expect(apply).not.toHaveBeenCalled()
})

it('updates stored memberships on incoming deletion even when its thought was not loaded', async () => {
  await withTreecrdtWriteBarrier(() =>
    provider.db.updateThoughts({ thoughtIndexUpdates: { [THOUGHT_ID]: thought('a') } }),
  )
  await waitForMaterializedThoughtsToStore()
  snapshot = { thoughtIndex: {}, lexemeIndex: {} }
  const events: MaterializationEvent[] = []
  const unsubscribe = client.onMaterialized(event => events.push(event))
  await client.local.delete(new Uint8Array(32).fill(2), THOUGHT_ID)
  await waitForMaterializedThoughtsToStore()
  unsubscribe()

  expect(events.some(event => event.changes.some(change => change.kind === 'delete'))).toBe(true)
  await expect(provider.db.getLexemeById(hashThought('a'))).resolves.toBeUndefined()
  // No deleted thought is loaded back into the view.
  expect(snapshot.thoughtIndex[THOUGHT_ID]).toBeNull()
})
