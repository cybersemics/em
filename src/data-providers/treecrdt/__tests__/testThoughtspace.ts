import type ThoughtId from '../../../@types/ThoughtId'
import type Timestamp from '../../../@types/Timestamp'
import { EM_TOKEN, SETTINGS_TOKEN, SETTINGS_VALUE } from '../../../constants'
import findDescendant from '../../../selectors/findDescendant'
import initialState from '../../../util/initialState'
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
const thought = (id: ThoughtId, parentId: ThoughtId, value: string) => ({
  id,
  parentId,
  value,
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

  expect(treecrdt.project().getChildren(EM_TOKEN)).toContain(SETTINGS_TOKEN)

  const settings = treecrdt.project().getThought(SETTINGS_TOKEN)!
  expect(settings).toMatchObject({
    id: SETTINGS_TOKEN,
    parentId: EM_TOKEN,
    value: SETTINGS_VALUE,
  })

  const settingsLexeme = treecrdt.project().getLexeme(SETTINGS_VALUE)
  expect(settingsLexeme).toEqual([SETTINGS_TOKEN])
})

it('finds the first duplicate attribute in canonical order without changing node ids', async () => {
  await initTestThoughtspace()
  await persistThoughts([thought(PARENT_ID, EM_TOKEN, 'parent')], { [PARENT_ID]: SETTINGS_TOKEN })
  await persistThoughts(
    [
      thought(PIN_ID, PARENT_ID, '=pin'),
      thought(PIN_DUPLICATE_ID, PARENT_ID, '=pin'),
      thought(FALSE_ID, PARENT_ID, 'false'),
    ],
    { [PIN_ID]: null, [PIN_DUPLICATE_ID]: PIN_ID, [FALSE_ID]: PIN_DUPLICATE_ID },
  )
  const state = { ...initialState(), thoughts: treecrdt.project() }
  expect(findDescendant(state, PARENT_ID, '=pin')).toBe(PIN_ID)
  expect(findDescendant(state, PARENT_ID, 'false')).toBe(FALSE_ID)
  expect(state.thoughts.getChildren(PARENT_ID)).toEqual([PIN_ID, PIN_DUPLICATE_ID, FALSE_ID])
})

it('reads previous parents and positions inside a transaction and current values afterward', async () => {
  await initTestThoughtspace()
  await persistThoughts(
    [
      thought(PARENT_ID, EM_TOKEN, 'parent'),
      thought(OTHER_PARENT_ID, EM_TOKEN, 'other'),
      thought(THOUGHT_A_ID, PARENT_ID, 'a'),
      thought(THOUGHT_B_ID, PARENT_ID, 'b'),
      thought(THOUGHT_X_ID, OTHER_PARENT_ID, 'x'),
    ],
    {
      [PARENT_ID]: SETTINGS_TOKEN,
      [OTHER_PARENT_ID]: PARENT_ID,
      [THOUGHT_A_ID]: null,
      [THOUGHT_B_ID]: THOUGHT_A_ID,
      [THOUGHT_X_ID]: null,
    },
  )
  const moved = treecrdt.transact(transaction => {
    const before = transaction.capturePrevious()
    const projected = transaction.update({
      thoughtIndexUpdates: { [THOUGHT_A_ID]: thought(THOUGHT_A_ID, OTHER_PARENT_ID, 'a') },
      movePlacements: { [THOUGHT_A_ID]: THOUGHT_X_ID },
    })
    expect(before.getChildren(PARENT_ID)).toEqual([THOUGHT_A_ID, THOUGHT_B_ID])
    expect(before.getPosition(THOUGHT_B_ID)).toBe(1)
    return projected
  })
  const projected = moved.value
  expect(projected.getChildren(PARENT_ID)).toEqual([THOUGHT_B_ID])
  expect(projected.getChildren(OTHER_PARENT_ID)).toEqual([THOUGHT_X_ID, THOUGHT_A_ID])
  expect(projected.getPosition(THOUGHT_B_ID)).toBe(0)
  expect(projected.getPosition(THOUGHT_A_ID)).toBe(1)
  expect(projected.getThought(THOUGHT_A_ID)).toMatchObject({ parentId: OTHER_PARENT_ID })
  await moved.persisted
})

it('keeps separately created thoughtspace instances isolated', async () => {
  const first = createMemoryThoughtspace()
  const second = createMemoryThoughtspace()

  try {
    await first.init({ storage: 'memory' })
    await second.init({ storage: 'memory' })

    await persistThoughtsTo(first, [thought(PARENT_ID, EM_TOKEN, 'first')], { [PARENT_ID]: SETTINGS_TOKEN })
    await persistThoughtsTo(second, [thought(PARENT_ID, EM_TOKEN, 'second')], { [PARENT_ID]: SETTINGS_TOKEN })

    expect(first.project().getThought(PARENT_ID)!).toMatchObject({ value: 'first' })
    expect(second.project().getThought(PARENT_ID)!).toMatchObject({ value: 'second' })
  } finally {
    await first.drop()
    await second.drop()
  }
})
