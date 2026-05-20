import { EM_TOKEN, SETTINGS_TOKEN, SETTINGS_VALUE } from '../../../constants'
import hashThought from '../../../util/hashThought'
import testThoughtspace, { init, resetTestThoughtspace } from '../testThoughtspace'

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
