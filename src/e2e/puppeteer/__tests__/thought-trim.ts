import click from '../helpers/click'
import getEditingText from '../helpers/getEditingText'
import paste from '../helpers/paste'
import press from '../helpers/press'

vi.setConfig({ testTimeout: 20000, hookTimeout: 20000 })

it('when cursor is null, thought will be trimmed.', async () => {
  const importText = `
  -    Hello World.      `

  await paste(importText)
  await click('#content')
  const editingText = await getEditingText()
  expect(editingText).toBe(`Hello World.`)
})

it('when change the row, thought will be trimmed.', async () => {
  const importText = `
  -       Hello World.      `

  await paste(importText)
  await press('Enter')
  await press('ArrowUp')
  const editingText = await getEditingText()
  expect(editingText).toBe(`Hello World.`)
})
