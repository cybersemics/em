import type { TreecrdtClient } from '@treecrdt/wa-sqlite'
import type Index from '../../../@types/IndexType'
import type Thought from '../../../@types/Thought'
import type ThoughtId from '../../../@types/ThoughtId'
import type Timestamp from '../../../@types/Timestamp'
import { EM_TOKEN } from '../../../constants'
import treecrdtThoughtspace, { init as initTreecrdtThoughtspace } from '../thoughtspace'
import { getTreecrdtClient, initTreecrdt } from '../treecrdt'

const TEST_REPLICA_ID = new Uint8Array(32).fill(2)
const FIXTURE_SIZE = 8

type ThoughtFixture = {
  movePlacements: Index<ThoughtId | null>
  readIds: ThoughtId[]
  thoughts: Thought[]
}

/** Converts a numeric fixture index to a valid TreeCRDT thought id. */
const fixtureId = (index: number): ThoughtId => index.toString(16).padStart(32, '0') as ThoughtId

/** Creates a minimal thought for provider performance fixtures. */
const thought = (id: ThoughtId, parentId: ThoughtId, value: string, rank: number): Thought => ({
  id,
  parentId,
  value,
  rank,
  childrenMap: {},
  created: 1 as Timestamp,
  lastUpdated: 1 as Timestamp,
  updatedBy: 'performance-fixture',
})

/** Creates siblings under one parent to expose costs that scale with tree width. */
const wideFixture = (size: number): ThoughtFixture => {
  const parentId = fixtureId(1000)
  const parent = thought(parentId, EM_TOKEN, 'wide-parent', 0)
  const children = Array.from({ length: size }, (_, index) =>
    thought(fixtureId(1001 + index), parentId, `wide-${index}`, index),
  )

  return {
    thoughts: [parent, ...children],
    readIds: children.map(child => child.id),
    movePlacements: Object.fromEntries(
      children.map((child, index) => [child.id, index === 0 ? null : children[index - 1].id]),
    ),
  }
}

/** Creates a single-child chain to expose costs that scale with tree depth. */
const deepFixture = (size: number): ThoughtFixture => {
  const thoughts = Array.from({ length: size }, (_, index) => {
    const id = fixtureId(2000 + index)
    const parentId = index === 0 ? EM_TOKEN : fixtureId(2000 + index - 1)
    return thought(id, parentId, `deep-${index}`, 0)
  })

  return {
    thoughts,
    readIds: thoughts.map(current => current.id),
    movePlacements: Object.fromEntries(thoughts.map(current => [current.id, null])),
  }
}

/** Persists a performance fixture through the real TreeCRDT data provider. */
const persistFixture = async ({ movePlacements, thoughts }: ThoughtFixture): Promise<void> => {
  await treecrdtThoughtspace.updateThoughts({
    thoughtIndexUpdates: Object.fromEntries(thoughts.map(current => [current.id, current])),
    lexemeIndexUpdates: {},
    lexemeIndexUpdatesOld: {},
    schemaVersion: 0,
    movePlacements,
  })
}

/** Instruments TreeCRDT methods that cross the worker or SQLite boundary during batched reads. */
const instrumentTreecrdtReads = (client: TreecrdtClient) => ({
  children: vi.spyOn(client.tree, 'children'),
  getPayload: vi.spyOn(client.tree, 'getPayload'),
  parent: vi.spyOn(client.tree, 'parent'),
  sqlGetText: vi.spyOn(client.runner, 'getText'),
})

/** Returns stable call counts from the TreeCRDT read instrumentation. */
const readCallCounts = (spies: ReturnType<typeof instrumentTreecrdtReads>) => ({
  children: spies.children.mock.calls.length,
  getPayload: spies.getPayload.mock.calls.length,
  parent: spies.parent.mock.calls.length,
  sqlGetText: spies.sqlGetText.mock.calls.length,
})

beforeEach(async () => {
  await treecrdtThoughtspace.clear()
  await initTreecrdt({ storage: 'memory', runtime: 'direct' })
  await initTreecrdtThoughtspace(TEST_REPLICA_ID)
})

afterEach(async () => {
  vi.restoreAllMocks()
  await treecrdtThoughtspace.clear()
})

it.each([
  ['wide', wideFixture],
  ['deep', deepFixture],
] as const)('characterizes TreeCRDT provider read calls for a %s fixture', async (_name, createFixture) => {
  const fixture = createFixture(FIXTURE_SIZE)
  await persistFixture(fixture)
  const readSpies = instrumentTreecrdtReads(getTreecrdtClient())

  const result = await treecrdtThoughtspace.getThoughtsByIds(fixture.readIds)

  expect(result.map(current => current?.id)).toEqual(fixture.readIds)
  // Characterize the current linear fan-out without imposing a wall-clock performance budget.
  expect(readCallCounts(readSpies)).toEqual({
    children: FIXTURE_SIZE * 2,
    getPayload: FIXTURE_SIZE,
    parent: FIXTURE_SIZE,
    sqlGetText: FIXTURE_SIZE,
  })
})
