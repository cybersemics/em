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
  press('Space')
  press('Space')
  press('Space')
  press('H')
  press('e')
  press('l')
  press('l')
  press('o')
  press('Space')
  press('W')
  press('o')
  press('r')
  press('l')
  press('d')
  press('.')
  press('Space')
  press('Space')
  press('Space')
  press('Enter')
  press('ArrowUp')

  const editingText = await getEditingText()
  expect(editingText).toBe(`Hello World.`)
})
