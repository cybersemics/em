import type Thought from '../../../@types/Thought'
import type ThoughtId from '../../../@types/ThoughtId'
import type Timestamp from '../../../@types/Timestamp'
import { EM_TOKEN, SETTINGS_TOKEN, SETTINGS_VALUE } from '../../../constants'
import testThoughtspace, { init, resetTestThoughtspace } from '../../../test-helpers/treecrdt/testThoughtspace'
import hashThought from '../../../util/hashThought'
import treecrdtThoughtspace, { init as initTreecrdtThoughtspace } from '../thoughtspace'
import { initTreecrdt } from '../treecrdt'

const CREATED = 100 as Timestamp

const A_ID = '00000000000000000000000000000100' as ThoughtId
const PIN_ID = '00000000000000000000000000000101' as ThoughtId
const FALSE_ID = '00000000000000000000000000000102' as ThoughtId
const PIN_DUPLICATE_ID = '00000000000000000000000000000103' as ThoughtId

/** Creates a minimal thought for TreeCRDT provider tests. */
const thought = (id: ThoughtId, value: string, parentId: ThoughtId, rank: number): Thought => ({
  id,
  value,
  parentId,
  rank,
  created: CREATED,
  lastUpdated: CREATED,
  updatedBy: 'test',
  childrenMap: {},
})

beforeEach(() => {
  resetTestThoughtspace()
})

afterEach(async () => {
  await treecrdtThoughtspace.clear()
})

it('seeds fixed system thoughts in the unit-test provider', async () => {
  await init(new Uint8Array([1]))

  const em = await testThoughtspace.getThoughtById(EM_TOKEN)
  expect(em?.childrenMap[SETTINGS_TOKEN]).toBe(SETTINGS_TOKEN)

  const settings = await testThoughtspace.getThoughtById(SETTINGS_TOKEN)
  expect(settings).toMatchObject({
    id: SETTINGS_TOKEN,
    parentId: EM_TOKEN,
    value: SETTINGS_VALUE,
  })

  const settingsLexeme = await testThoughtspace.getLexemeById(hashThought(SETTINGS_VALUE))
  expect(settingsLexeme?.contexts).toEqual([SETTINGS_TOKEN])
})

it('does not delete test-provider lexemes when freeing cache', async () => {
  await init(new Uint8Array([1]))

  const settingsKey = hashThought(SETTINGS_VALUE)
  await testThoughtspace.freeLexeme(settingsKey)

  const settingsLexeme = await testThoughtspace.getLexemeById(settingsKey)
  expect(settingsLexeme?.contexts).toEqual([SETTINGS_TOKEN])
})

it('does not require an initialized TreeCRDT client when freeing lexeme cache', async () => {
  await expect(treecrdtThoughtspace.freeLexeme(hashThought('missing'))).resolves.toBeUndefined()
})

it('materializes meta attributes with value keys and ThoughtId values', async () => {
  await initTreecrdt()
  await initTreecrdtThoughtspace(new Uint8Array(32).fill(1))

  await treecrdtThoughtspace.updateThoughts({
    thoughtIndexUpdates: {
      [A_ID]: thought(A_ID, 'a', EM_TOKEN, 1),
      [PIN_ID]: thought(PIN_ID, '=pin', A_ID, 0),
      [FALSE_ID]: thought(FALSE_ID, 'false', PIN_ID, 0),
      [PIN_DUPLICATE_ID]: thought(PIN_DUPLICATE_ID, '=pin', A_ID, 1),
    },
    lexemeIndexUpdates: {},
    lexemeIndexUpdatesOld: {},
    schemaVersion: 0,
  })

  const a = await treecrdtThoughtspace.getThoughtById(A_ID)
  expect(a?.childrenMap['=pin']).toBe(PIN_ID)
  expect(a?.childrenMap[PIN_DUPLICATE_ID]).toBe(PIN_DUPLICATE_ID)
  expect(Object.values(a?.childrenMap || {})).toEqual([PIN_ID, PIN_DUPLICATE_ID])

  const pin = await treecrdtThoughtspace.getThoughtById(PIN_ID)
  expect(pin?.childrenMap[FALSE_ID]).toBe(FALSE_ID)
  expect(pin?.childrenMap.false).toBeUndefined()
})
