import click from '../helpers/click'
import clickThought from '../helpers/clickThought'
import exportThoughts from '../helpers/exportThoughts'
import getEditingText from '../helpers/getEditingText'
import paste from '../helpers/paste'
import waitForEditable from '../helpers/waitForEditable'
import { page } from '../session'

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

/** Returns whether the Bold toolbar button is rendered in its active state. */
const isBoldButtonActive = () =>
  page.evaluate(
    () =>
      document.querySelector('[data-testid="toolbar-icon"][aria-label="Bold"]')?.getAttribute('data-active') === 'true',
  )

// Regression test for #3912: the Bold/Italic/Underline/Strikethrough buttons flickered back to their inactive
// state when the cursor was moved to a fully-formatted thought by tapping its bullet (Chrome/Android). Moving the
// cursor with a collapsed caret should reflect the whole-thought formatting, not a stale empty selection.
it('Bold button stays active when the cursor is moved to a fully-bold thought via its bullet (#3912)', async () => {
  const importText = `
  - One
  - Two`

  await paste(importText)

  // format the whole first thought as bold
  await clickThought('One')
  await click('[data-testid="toolbar-icon"][aria-label="Bold"]')
  await waitForEditable('<b>One</b>')

  // move the cursor to the plain thought: the Bold button should be inactive
  await clickThought('Two')
  expect(await isBoldButtonActive()).toBe(false)

  // move the cursor back to the bold thought by tapping its bullet
  const editableOne = await waitForEditable('<b>One</b>')
  const bulletNode = await page.evaluateHandle(editableNode => {
    if (!editableNode) throw new Error('Node handle does not contain a valid Element')
    const thoughtContainer = editableNode.closest('[aria-label="thought-container"]')
    if (!thoughtContainer) throw new Error('Thought container not found')
    const bullet = thoughtContainer.querySelector('[aria-label="bullet"]')
    if (!bullet) throw new Error('Bullet not found in thought container')
    return bullet
  }, editableOne)
  // @ts-expect-error - https://github.com/puppeteer/puppeteer/issues/8852
  await bulletNode.asElement()?.click()

  // wait for the caret to settle at the start of the bold thought so the command state has updated
  await page.waitForFunction(() => (window.getSelection()?.focusOffset ?? -1) === 0)

  // the Bold button should reflect the thought's bold formatting rather than flickering back to inactive
  expect(await isBoldButtonActive()).toBe(true)
})
