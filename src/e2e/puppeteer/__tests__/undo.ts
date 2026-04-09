import { KnownDevices } from 'puppeteer'
import newThoughtCommand from '../../../commands/newThought'
import click from '../helpers/click'
import clickThought from '../helpers/clickThought'
import exportThoughts from '../helpers/exportThoughts'
import gesture from '../helpers/gesture'
import getEditingText from '../helpers/getEditingText'
import keyboard from '../helpers/keyboard'
import paste from '../helpers/paste'
import press from '../helpers/press'
import { page } from '../setup'

vi.setConfig({ testTimeout: 20000, hookTimeout: 20000 })

it('Re-render cursor thought on undo', async () => {
  // create a thought "hello"
  await press('Enter')
  await keyboard.type('hello')

  // create a thought "a"
  await press('Enter')
  await keyboard.type('a')

  // edit "hello" to "hello world"
  await clickThought('hello')
  await press('ArrowRight', { ctrl: true })
  await keyboard.type(' world')

  // undo
  await press('z', { meta: true })

  const thoughtValue = await getEditingText()
  expect(thoughtValue).toBe('hello')
})

// We have to test this in puppeteer because chained commands are executed as separate commands at a higher level than action-creators and undone with an ad hoc mergeUndo property on the action.
it('Undo Select All + Categorize chained command in one step', async () => {
  await page.emulate(KnownDevices['iPhone 15 Pro'])

  // create thoughts a, b, c
  await gesture(newThoughtCommand)
  await keyboard.type('a')
  await gesture(newThoughtCommand)
  await keyboard.type('b')
  await gesture(newThoughtCommand)
  await keyboard.type('c')

  // Select All + Categorize
  await gesture('ldr' + 'lu')

  const exported1 = await exportThoughts()
  expect(exported1).toBe(`
- 
  - a
  - b
  - c
`)

  await press('z', { meta: true })

  const exported2 = await exportThoughts()
  expect(exported2).toBe(`
- a
- b
- c
`)

  // make sure multicursor is disabled after undo
  const highlightedCount = await page.evaluate(() => document.querySelectorAll('[data-highlighted=true]').length)

  expect(highlightedCount).toBe(0)
})

it('Should revert background color changes back to previous values', async () => {
  const importText = `
    - Lorem Ipsum Dolor Sit Amet`

  await paste(importText)

  // open the ColorPicker
  await click('[data-testid="toolbar-icon"][aria-label="Text Color"]')

  const thought = await page.$('[aria-label=thought] [data-editable=true]')
  const boundingBox = await thought?.boundingBox()

  if (!boundingBox) throw new Error('boundingBox not found')

  const y = boundingBox.y + boundingBox.height / 2

  // get a position near the left edge of the thought
  const leftX = boundingBox.x + 1

  // double click to select the first word
  await page.mouse.click(leftX, y, { clickCount: 2 })

  // set the first word's background color to green
  await click('[aria-label="background color swatches"] [aria-label="green"]')

  // dismiss the existing selection range
  await page.mouse.click(leftX, y)

  // get a position near the right edge of the thought
  const rightX = boundingBox.x + boundingBox.width - 36

  // double click to select the last word
  await page.mouse.click(rightX, y, { clickCount: 2 })

  // set the last word's background color to green
  await click('[aria-label="background color swatches"] [aria-label="green"]')

  // dismiss the existing selection range
  await page.mouse.click(rightX, y)

  // get a position at the center of the thought
  const centerX = boundingBox.x + boundingBox.width / 2

  // click to place the caret in the center of the thought
  await page.mouse.click(centerX, y)

  // set the entire thought's background color to red
  await click('[aria-label="background color swatches"] [aria-label="red"]')

  // undo
  await press('z', { meta: true })

  // now the first and last words should have a green background again
  const text = await getEditingText()
  expect(text).toBe(
    '<font color="#000000" style="background-color: rgb(0, 214, 136);">Lorem</font> Ipsum Dolor Sit <font color="#000000" style="background-color: rgb(0, 214, 136);">Amet</font>',
  )
})
