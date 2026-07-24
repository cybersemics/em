import type { MaterializationListener } from '@treecrdt/interface/engine'
import { createTreecrdtClient } from '@treecrdt/wa-sqlite'
import type ThoughtId from '../../../@types/ThoughtId'
import type Timestamp from '../../../@types/Timestamp'
import { EM_TOKEN } from '../../../constants'
import type { DataProvider } from '../../DataProvider'
import createTreecrdtDataProvider from '../thoughtspace'

const { enqueueMaterializedThoughtsToStore } = vi.hoisted(() => ({
  enqueueMaterializedThoughtsToStore: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../sync', async importOriginal => {
  const actual = await importOriginal<typeof import('../sync')>()
  return { ...actual, enqueueMaterializedThoughtsToStore }
})

const THOUGHT_ID = '00000000000000000000000000000201' as ThoughtId

/** Creates a minimal thought fixture for the session binding regression. */
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

/** Persists one thought through the public provider. */
const persistThought = (db: Pick<DataProvider, 'updateThoughts'>, value: string) =>
  db.updateThoughts({
    thoughtIndexUpdates: { [THOUGHT_ID]: thought(value) },
    lexemeIndexUpdates: {},
    lexemeIndexUpdatesOld: {},
    schemaVersion: 0,
  })

it('enqueues materialization with a provider bound to the emitting session', async () => {
  const clientOne = await createTreecrdtClient({
    storage: { type: 'memory' },
    runtime: { type: 'direct' },
    docId: 'session-bound-materialization-one',
  })
  const clientTwo = await createTreecrdtClient({
    storage: { type: 'memory' },
    runtime: { type: 'direct' },
    docId: 'session-bound-materialization-two',
  })
  const provider = createTreecrdtDataProvider()
  const materialization = {
    getSnapshot: () => ({ schemaVersion: 0, thoughtIndex: {}, lexemeIndex: {} }),
    apply: vi.fn(),
  }

  let onMaterializedOne: MaterializationListener | undefined
  vi.spyOn(clientOne, 'onMaterialized').mockImplementation(listener => {
    onMaterializedOne = listener
    return () => undefined
  })

  try {
    await provider.bindSession(clientOne, new Uint8Array(32).fill(1), materialization)
    await persistThought(provider.db, 'session one')

    onMaterializedOne?.({
      headSeq: 1,
      changes: [{ kind: 'payload', node: THOUGHT_ID, payload: null }],
    })

    expect(enqueueMaterializedThoughtsToStore).toHaveBeenCalledTimes(1)
    const [, , enqueuedClient, enqueuedDb] = enqueueMaterializedThoughtsToStore.mock.calls[0] as unknown as [
      unknown,
      unknown,
      typeof clientOne,
      Pick<DataProvider, 'getThoughtById'>,
    ]

    provider.resetSession(new Error('switch test session'))
    await provider.bindSession(clientTwo, new Uint8Array(32).fill(2), materialization)
    await persistThought(provider.db, 'session two')

    expect(enqueuedClient).toBe(clientOne)
    expect(enqueuedDb).not.toBe(provider.db)
    await expect(enqueuedDb.getThoughtById(THOUGHT_ID)).resolves.toMatchObject({ value: 'session one' })
    await expect(provider.db.getThoughtById(THOUGHT_ID)).resolves.toMatchObject({ value: 'session two' })
  } finally {
    await clientOne.drop()
    await clientTwo.drop()
  }
})
