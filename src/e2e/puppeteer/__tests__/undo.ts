import { KnownDevices } from 'puppeteer'
import newThoughtCommand from '../../../commands/newThought'
import { HOME_TOKEN } from '../../../constants'
import clickThought from '../helpers/clickThought'
import exportThoughts from '../helpers/exportThoughts'
import getEditingText from '../helpers/getEditingText'
import keyboard from '../helpers/keyboard'
import press from '../helpers/press'
import swipe from '../helpers/swipe'
import { page } from '../setup'

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
  await swipe(newThoughtCommand, true)
  await keyboard.type('a')
  await swipe(newThoughtCommand, true)
  await keyboard.type('b')
  await swipe(newThoughtCommand, true)
  await keyboard.type('c')

  // Select All + Categorize
  await swipe('ldr' + 'lu', true)

  const exported1 = await exportThoughts()
  expect(exported1).toBe(`- ${HOME_TOKEN}
  - 
    - a
    - b
    - c`)

  await press('z', { meta: true })

  const exported2 = await exportThoughts()
  expect(exported2).toBe(`- ${HOME_TOKEN}
  - a
  - b
  - c`)

  // make sure multicursor is disabled after undo
  const highlightedCount = await page.evaluate(() => document.querySelectorAll('[data-highlighted=true]').length)

  expect(highlightedCount).toBe(0)
})
