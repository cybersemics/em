import getEditingText from '../helpers/getEditingText'
import newThought from '../helpers/newThought'
import paste from '../helpers/paste'
import press from '../helpers/press'

vi.setConfig({ testTimeout: 20000, hookTimeout: 20000 })

it('thought will be trimmed when paste the text', async () => {
  const importText = `
  -    Hello World.      `

  await paste(importText)
  const editingText = await getEditingText()
  expect(editingText).toBe(`Hello World.`)
})

it('when change the row, thought will be trimmed.', async () => {
  await newThought('')

  await press('Space')
  await press('Space')
  await press('Space')
  await press('H')
  await press('e')
  await press('l')
  await press('l')
  await press('o')
  await press('Space')
  await press('W')
  await press('o')
  await press('r')
  await press('l')
  await press('d')
  await press('.')
  await press('Space')
  await press('Space')
  await press('Space')
  await press('Enter')
  await press('ArrowUp')

  const editingText = await getEditingText()
  expect(editingText).toBe(`Hello World.`)
})
