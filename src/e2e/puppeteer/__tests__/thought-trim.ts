import { KeyInput } from 'puppeteer'
import executeKeyPresses from '../helpers/executeKeyPresses'
import getEditingText from '../helpers/getEditingText'
import newThought from '../helpers/newThought'
import paste from '../helpers/paste'

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

  const keyPresses = [
    'Space',
    'Space',
    'Space',
    'H',
    'e',
    'l',
    'l',
    'o',
    'Space',
    'W',
    'o',
    'r',
    'l',
    'd',
    '.',
    'Space',
    'Space',
    'Space',
    'Enter',
    'ArrowUp',
  ] as KeyInput[]

  await executeKeyPresses(keyPresses)

  const editingText = await getEditingText()
  expect(editingText).toBe(`Hello World.`)
})
