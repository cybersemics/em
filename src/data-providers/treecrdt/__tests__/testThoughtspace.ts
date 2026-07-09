import type ThoughtId from '../../../@types/ThoughtId'
import type Timestamp from '../../../@types/Timestamp'
import { EM_TOKEN, SETTINGS_TOKEN, SETTINGS_VALUE } from '../../../constants'
import hashThought from '../../../util/hashThought'
import treecrdtThoughtspace, { createIndexedChildrenMap, init as initTreecrdtThoughtspace } from '../thoughtspace'
import { getTreecrdtClient, initTreecrdt } from '../treecrdt'

const TEST_REPLICA_ID = new Uint8Array(32).fill(1)

/** Initializes an isolated in-memory TreeCRDT client and thoughtspace for unit tests. */
const initTestThoughtspace = async (replicaId: Uint8Array = TEST_REPLICA_ID): Promise<void> => {
  await initTreecrdt()
  await initTreecrdtThoughtspace(replicaId)
}

const PIN_ID = '00000000000000000000000000000101' as ThoughtId
const FALSE_ID = '00000000000000000000000000000102' as ThoughtId
const PIN_DUPLICATE_ID = '00000000000000000000000000000103' as ThoughtId
const PARENT_ID = '00000000000000000000000000000110' as ThoughtId
const OTHER_PARENT_ID = '00000000000000000000000000000111' as ThoughtId
const THOUGHT_A_ID = '00000000000000000000000000000112' as ThoughtId
const THOUGHT_Y_ID = '00000000000000000000000000000113' as ThoughtId
const THOUGHT_B_ID = '00000000000000000000000000000114' as ThoughtId
const THOUGHT_X_ID = '00000000000000000000000000000115' as ThoughtId

/** Creates a minimal thought fixture for provider-level ordering tests. */
const thought = (id: ThoughtId, parentId: ThoughtId, value: string, rank: number) => ({
  id,
  parentId,
  value,
  rank,
  childrenMap: {},
  created: 1 as Timestamp,
  lastUpdated: 1 as Timestamp,
  updatedBy: 'test',
})

/** Persists thoughts through the real TreeCRDT data provider. */
const persistThoughts = (
  thoughts: ReturnType<typeof thought>[],
  movePlacements?: Record<ThoughtId, ThoughtId | null>,
) =>
  treecrdtThoughtspace.updateThoughts({
    thoughtIndexUpdates: Object.fromEntries(thoughts.map(thought => [thought.id, thought])),
    lexemeIndexUpdates: {},
    lexemeIndexUpdatesOld: {},
    schemaVersion: 0,
    movePlacements,
  })

beforeEach(async () => {
  await treecrdtThoughtspace.clear()
})

afterEach(async () => {
  await treecrdtThoughtspace.clear()
})

it('seeds fixed system thoughts in the TreeCRDT provider', async () => {
  await initTestThoughtspace()

  const em = await treecrdtThoughtspace.getThoughtById(EM_TOKEN)
  expect(em?.childrenMap[SETTINGS_TOKEN]).toBe(SETTINGS_TOKEN)

  const settings = await treecrdtThoughtspace.getThoughtById(SETTINGS_TOKEN)
  expect(settings).toMatchObject({
    id: SETTINGS_TOKEN,
    parentId: EM_TOKEN,
    value: SETTINGS_VALUE,
  })

  const settingsLexeme = await treecrdtThoughtspace.getLexemeById(hashThought(SETTINGS_VALUE))
  expect(settingsLexeme?.contexts).toEqual([SETTINGS_TOKEN])
})

it('does not delete persisted lexemes when freeing cache', async () => {
  await initTestThoughtspace()

  const settingsKey = hashThought(SETTINGS_VALUE)
  await treecrdtThoughtspace.freeLexeme(settingsKey)

  const settingsLexeme = await treecrdtThoughtspace.getLexemeById(settingsKey)
  expect(settingsLexeme?.contexts).toEqual([SETTINGS_TOKEN])
})

it('does not require an initialized TreeCRDT client when freeing lexeme cache', async () => {
  await expect(treecrdtThoughtspace.freeLexeme(hashThought('missing'))).resolves.toBeUndefined()
})

it('uses indexed attribute values as childrenMap keys without changing TreeCRDT node ids', async () => {
  const valueById = {
    [PIN_ID]: '=pin',
    [PIN_DUPLICATE_ID]: '=pin',
  }

  const childrenMap = createIndexedChildrenMap([PIN_ID, PIN_DUPLICATE_ID, FALSE_ID], valueById)

  expect(childrenMap['=pin']).toBe(PIN_ID)
  expect(childrenMap[PIN_DUPLICATE_ID]).toBe(PIN_DUPLICATE_ID)
  expect(childrenMap[FALSE_ID]).toBe(FALSE_ID)
  expect(childrenMap.false).toBeUndefined()
  expect(Object.values(childrenMap)).toEqual([PIN_ID, PIN_DUPLICATE_ID, FALSE_ID])
})

it('falls back to rank placement when explicit afterId is stale', async () => {
  await initTestThoughtspace(new Uint8Array(32).fill(1))

  await persistThoughts([thought(PARENT_ID, EM_TOKEN, 'parent', 0), thought(OTHER_PARENT_ID, EM_TOKEN, 'other', 1)])
  await persistThoughts([thought(THOUGHT_A_ID, PARENT_ID, 'a', 0)])
  await persistThoughts([thought(THOUGHT_Y_ID, PARENT_ID, 'y', 1)])
  await persistThoughts([thought(THOUGHT_B_ID, PARENT_ID, 'b', 2)])
  await persistThoughts([thought(THOUGHT_X_ID, PARENT_ID, 'x', 3)])

  await persistThoughts([thought(THOUGHT_Y_ID, OTHER_PARENT_ID, 'y', 0)], {
    [THOUGHT_Y_ID]: null,
  })

  await expect(
    persistThoughts([thought(THOUGHT_X_ID, PARENT_ID, 'x', 1)], {
      [THOUGHT_X_ID]: THOUGHT_Y_ID,
    }),
  ).resolves.toBeDefined()

  await expect(getTreecrdtClient().tree.children(PARENT_ID)).resolves.toEqual([
    THOUGHT_A_ID,
    THOUGHT_X_ID,
    THOUGHT_B_ID,
  ])
})
