import type ThoughtId from '../../../@types/ThoughtId'
import type Timestamp from '../../../@types/Timestamp'
import { EM_TOKEN, SETTINGS_TOKEN, SETTINGS_VALUE } from '../../../constants'
import hashThought from '../../../util/hashThought'
import createMemoryThoughtspace from '../createMemoryThoughtspace'

/** Initializes an isolated in-memory TreeCRDT client and thoughtspace for unit tests. */
const treecrdt = createMemoryThoughtspace()

/** Initializes the bound in-memory test runtime. */
const initTestThoughtspace = async (): Promise<void> => {
  await treecrdt.init({ storage: 'memory' })
}

const PIN_ID = '00000000000000000000000000000101' as ThoughtId
const FALSE_ID = '00000000000000000000000000000102' as ThoughtId
const PIN_DUPLICATE_ID = '00000000000000000000000000000103' as ThoughtId
const PARENT_ID = '00000000000000000000000000000110' as ThoughtId
const OTHER_PARENT_ID = '00000000000000000000000000000111' as ThoughtId
const THOUGHT_A_ID = '00000000000000000000000000000112' as ThoughtId
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

/** Persists thoughts through the real TreeCRDT document transaction. */
const persistThoughtsTo = (
  runtime: ReturnType<typeof createMemoryThoughtspace>,
  thoughts: ReturnType<typeof thought>[],
  movePlacements: Record<ThoughtId, ThoughtId | null>,
) =>
  runtime.transact(transaction =>
    transaction.update({
      thoughtIndexUpdates: Object.fromEntries(thoughts.map(thought => [thought.id, thought])),
      movePlacements,
    }),
  ).persisted

/** Persists thoughts through the shared test thoughtspace. */
const persistThoughts = (thoughts: ReturnType<typeof thought>[], movePlacements: Record<ThoughtId, ThoughtId | null>) =>
  persistThoughtsTo(treecrdt, thoughts, movePlacements)

afterEach(async () => {
  await treecrdt.drop()
})

it('seeds fixed system thoughts in the TreeCRDT provider', async () => {
  await initTestThoughtspace()

  const em = treecrdt.project().thoughtIndex[EM_TOKEN]
  expect(em?.childrenMap[SETTINGS_TOKEN]).toBe(SETTINGS_TOKEN)

  const settings = treecrdt.project().thoughtIndex[SETTINGS_TOKEN]
  expect(settings).toMatchObject({
    id: SETTINGS_TOKEN,
    parentId: EM_TOKEN,
    value: SETTINGS_VALUE,
  })

  const settingsLexeme = treecrdt.project().lexemeIndex[hashThought(SETTINGS_VALUE)]
  expect(settingsLexeme?.contexts).toEqual([SETTINGS_TOKEN])
})

it('uses attribute values as childrenMap keys without changing TreeCRDT node ids', async () => {
  await initTestThoughtspace()
  await persistThoughts([thought(PARENT_ID, EM_TOKEN, 'parent', 0)], { [PARENT_ID]: SETTINGS_TOKEN })
  await persistThoughts(
    [
      thought(PIN_ID, PARENT_ID, '=pin', 0),
      thought(PIN_DUPLICATE_ID, PARENT_ID, '=pin', 1),
      thought(FALSE_ID, PARENT_ID, 'false', 2),
    ],
    { [PIN_ID]: null, [PIN_DUPLICATE_ID]: PIN_ID, [FALSE_ID]: PIN_DUPLICATE_ID },
  )
  const { childrenMap } = treecrdt.project().thoughtIndex[PARENT_ID]!

  expect(childrenMap['=pin']).toBe(PIN_ID)
  expect(childrenMap[PIN_DUPLICATE_ID]).toBe(PIN_DUPLICATE_ID)
  expect(childrenMap[FALSE_ID]).toBe(FALSE_ID)
  expect(childrenMap.false).toBeUndefined()
  expect(Object.values(childrenMap)).toEqual([PIN_ID, PIN_DUPLICATE_ID, FALSE_ID])
})

it('projects compatibility ranks for both parents after a cross-parent move', async () => {
  await initTestThoughtspace()
  await persistThoughts(
    [
      thought(PARENT_ID, EM_TOKEN, 'parent', 0),
      thought(OTHER_PARENT_ID, EM_TOKEN, 'other', 1),
      thought(THOUGHT_A_ID, PARENT_ID, 'a', 0),
      thought(THOUGHT_B_ID, PARENT_ID, 'b', 1),
      thought(THOUGHT_X_ID, OTHER_PARENT_ID, 'x', 0),
    ],
    {
      [PARENT_ID]: SETTINGS_TOKEN,
      [OTHER_PARENT_ID]: PARENT_ID,
      [THOUGHT_A_ID]: null,
      [THOUGHT_B_ID]: THOUGHT_A_ID,
      [THOUGHT_X_ID]: null,
    },
  )
  const { thoughtIndex } = treecrdt.project()
  const loaded = [PARENT_ID, OTHER_PARENT_ID, THOUGHT_A_ID, THOUGHT_B_ID, THOUGHT_X_ID].map(id => thoughtIndex[id])
  const moved = treecrdt.transact(transaction =>
    transaction.update(
      {
        thoughtIndexUpdates: { [THOUGHT_A_ID]: thought(THOUGHT_A_ID, OTHER_PARENT_ID, 'a', 1) },
        movePlacements: { [THOUGHT_A_ID]: THOUGHT_X_ID },
      },
      { thoughtIndex: Object.fromEntries(loaded.map(thought => [thought!.id, thought!])), lexemeIndex: {} },
    ),
  )
  const projected = moved.value.thoughtIndex

  expect(Object.values(projected[PARENT_ID].childrenMap)).toEqual([THOUGHT_B_ID])
  expect(Object.values(projected[OTHER_PARENT_ID].childrenMap)).toEqual([THOUGHT_X_ID, THOUGHT_A_ID])
  expect(projected[THOUGHT_B_ID].rank).toBe(0)
  expect(projected[THOUGHT_X_ID].rank).toBe(0)
  expect(projected[THOUGHT_A_ID]).toMatchObject({ parentId: OTHER_PARENT_ID, rank: 1 })
  await moved.persisted
})

it('preserves the requested sibling order when inserting a wide batch', async () => {
  await initTestThoughtspace()
  await persistThoughts([thought(PARENT_ID, EM_TOKEN, 'parent', 0)], { [PARENT_ID]: SETTINGS_TOKEN })

  const childIds = Array.from({ length: 40 }, (_, index) => (index + 512).toString(16).padStart(32, '0') as ThoughtId)
  await persistThoughts(
    childIds.map((id, index) => thought(id, PARENT_ID, `child-${index}`, 0)),
    Object.fromEntries(childIds.map((id, index) => [id, childIds[index - 1] ?? null])),
  )

  const parent = treecrdt.project().thoughtIndex[PARENT_ID]
  expect(Object.values(parent?.childrenMap ?? {})).toEqual(childIds)
  const { thoughtIndex } = treecrdt.project()
  const children = childIds.map(id => thoughtIndex[id])
  expect(children.map(child => child?.rank)).toEqual(childIds.map((_, index) => index))
})

it('keeps separately created thoughtspace instances isolated', async () => {
  const first = createMemoryThoughtspace()
  const second = createMemoryThoughtspace()

  try {
    await first.init({ storage: 'memory' })
    await second.init({ storage: 'memory' })

    await persistThoughtsTo(first, [thought(PARENT_ID, EM_TOKEN, 'first', 0)], { [PARENT_ID]: SETTINGS_TOKEN })
    await persistThoughtsTo(second, [thought(PARENT_ID, EM_TOKEN, 'second', 0)], { [PARENT_ID]: SETTINGS_TOKEN })

    expect(first.project().thoughtIndex[PARENT_ID]).toMatchObject({ value: 'first' })
    expect(second.project().thoughtIndex[PARENT_ID]).toMatchObject({ value: 'second' })
  } finally {
    await first.drop()
    await second.drop()
  }
})
