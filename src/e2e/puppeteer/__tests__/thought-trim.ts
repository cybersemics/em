import click from '../helpers/click'
import exportThoughts from '../helpers/exportThoughts'
import getEditingText from '../helpers/getEditingText'
import newThought from '../helpers/newThought'
import paste from '../helpers/paste'
import press from '../helpers/press'
import setSelection from '../helpers/setSelection'
import waitForEditable from '../helpers/waitForEditable'

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

// https://github.com/cybersemics/em/issues/5232
it('trims a pasted trailing space when the thought is blurred', async () => {
  await newThought('One two three')
  await waitForEditable('One two three')

  // copy "One " including the trailing space that a double-click selection carries
  await setSelection(0, 4)
  await press('KeyC', { ctrl: true })

  // paste it over "three"
  await setSelection(8, 13)
  await press('KeyV', { ctrl: true })
  await waitForEditable('One two One ')

  // click away to blur the thought
  await click('#content')

  expect(await exportThoughts()).toBe(`
- One two One
`)
})
