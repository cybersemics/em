import click from '../helpers/click'
import clickThought from '../helpers/clickThought'
import exportThoughts from '../helpers/exportThoughts'
import getEditingText from '../helpers/getEditingText'
import paste from '../helpers/paste'
import waitForEditable from '../helpers/waitForEditable'
import { page } from '../setup'

vi.setConfig({ testTimeout: 20000, hookTimeout: 60000 })

it('Apply formatting to a selected portion of a thought', async () => {
  const importText = `
  - Golden Retriever`

  await paste(importText)

  const editableNodeHandle = await waitForEditable('Golden Retriever')

  // Double click inside the left edge to select the first word
  const boundingBox = await editableNodeHandle.asElement()?.boundingBox()

  if (!boundingBox) throw new Error('boundingBox not found')

  const x = boundingBox.x + 1
  const y = boundingBox.y + boundingBox.height / 2

  await page.mouse.click(x, y, { clickCount: 2 })

  await click('[data-testid="toolbar-icon"][aria-label="Bold"]')

  // get exported html and compress all indentation (whitespace before/after newline)
  const output = await exportThoughts()
  expect(output).toBe(`
- **Golden** Retriever
`)
})

it('Apply text color to an uppercase formatting tag', async () => {
  const importText = `
  - Hello World`

  await paste(importText)

  await clickThought('Hello World')

  await click('[data-testid="toolbar-icon"][aria-label="Text Color"]')
  await click('[aria-label="background color swatches"] [aria-label="blue"]')

  await click('[data-testid="toolbar-icon"][aria-label="Letter Case"]')
  await click('[aria-label="letter case swatches"] [aria-label="UpperCase"]')

  await click('[data-testid="toolbar-icon"][aria-label="Text Color"]')
  await click('[aria-label="text color swatches"] [aria-label="blue"]')

  const result = await getEditingText()
  expect(result).toBe('<font color="#00c7e6">HELLO WORLD</font>')
})
