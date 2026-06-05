import { EM_TOKEN, SETTINGS_TOKEN, SETTINGS_VALUE } from '../../../constants'
import testThoughtspace, { init, resetTestThoughtspace } from '../../../test-helpers/treecrdt/testThoughtspace'
import hashThought from '../../../util/hashThought'
import treecrdtThoughtspace from '../thoughtspace'

beforeEach(() => {
  resetTestThoughtspace()
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
