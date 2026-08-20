import type { MaterializationListener } from '@treecrdt/interface/engine'
import { createTreecrdtClient } from '@treecrdt/wa-sqlite'
import type ThoughtId from '../../../@types/ThoughtId'
import type Timestamp from '../../../@types/Timestamp'
import { EM_TOKEN } from '../../../constants'
import type { DataProvider } from '../../DataProvider'
import type { enqueueMaterializedThoughtsToStore as EnqueueMaterializedThoughtsToStore } from '../sync/applyMaterializedThoughtsToStore'
import createTreecrdtDataProvider from '../thoughtspace'

const { enqueueMaterializedThoughtsToStore } = vi.hoisted(() => ({
  enqueueMaterializedThoughtsToStore: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../sync', async importOriginal => {
  const actual = await importOriginal<typeof import('../sync')>()
  return { ...actual, enqueueMaterializedThoughtsToStore }
})

const THOUGHT_ID = '00000000000000000000000000000201' as ThoughtId

/** Creates a minimal thought fixture for the materialization context regression. */
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

it('retains the originating materialization context after rebinding the provider', async () => {
  const clientOne = await createTreecrdtClient({
    storage: { type: 'memory' },
    runtime: { type: 'direct' },
    docId: 'materialization-context-one',
  })
  const clientTwo = await createTreecrdtClient({
    storage: { type: 'memory' },
    runtime: { type: 'direct' },
    docId: 'materialization-context-two',
  })
  const provider = createTreecrdtDataProvider()
  const bridgeOne = {
    getSnapshot: () => ({ schemaVersion: 0, thoughtIndex: {}, lexemeIndex: {} }),
    apply: vi.fn(),
  }
  const bridgeTwo = {
    getSnapshot: () => ({ schemaVersion: 0, thoughtIndex: {}, lexemeIndex: {} }),
    apply: vi.fn(),
  }

  let onMaterializedOne: MaterializationListener | undefined
  vi.spyOn(clientOne, 'onMaterialized').mockImplementation(listener => {
    onMaterializedOne = listener
    return () => undefined
  })

  try {
    await provider.bindClient(clientOne, new Uint8Array(32).fill(1), bridgeOne)
    await persistThought(provider.db, 'client one')

    provider.resetBinding(new Error('switch client binding'))
    await provider.bindClient(clientTwo, new Uint8Array(32).fill(2), bridgeTwo)
    await persistThought(provider.db, 'client two')

    onMaterializedOne?.({
      headSeq: 1,
      changes: [{ kind: 'payload', node: THOUGHT_ID, payload: null }],
    })

    expect(enqueueMaterializedThoughtsToStore).toHaveBeenCalledTimes(1)
    const [, context] = enqueueMaterializedThoughtsToStore.mock.calls[0] as unknown as Parameters<
      typeof EnqueueMaterializedThoughtsToStore
    >

    expect(context.bridge).toBe(bridgeOne)
    expect(context.client).toBe(clientOne)
    expect(context.db).not.toBe(provider.db)
    await expect(context.db.getThoughtById(THOUGHT_ID)).resolves.toMatchObject({ value: 'client one' })
    await expect(provider.db.getThoughtById(THOUGHT_ID)).resolves.toMatchObject({ value: 'client two' })
  } finally {
    await clientOne.drop()
    await clientTwo.drop()
  }
})
