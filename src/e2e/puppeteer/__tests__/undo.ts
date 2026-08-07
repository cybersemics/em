import { KnownDevices } from 'puppeteer'
import newThoughtCommand from '../../../commands/newThought'
import clickThought from '../helpers/clickThought'
import exportThoughts from '../helpers/exportThoughts'
import gesture from '../helpers/gesture'
import getEditingText from '../helpers/getEditingText'
import keyboard from '../helpers/keyboard'
import newThought from '../helpers/newThought'
import press from '../helpers/press'
import waitUntil from '../helpers/waitUntil'
import { page } from '../session'

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

// We have to test this in puppeteer because chained commands are executed as separate commands at a higher level than action-creators and undone with an ad hoc mergeNext property on the action.
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

  // make sure multicursor is disabled after chained command
  const highlightedCountAfterChain = await page.evaluate(
    () => document.querySelectorAll('[data-highlighted=true]').length,
  )

  expect(highlightedCountAfterChain).toBe(0)

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

// https://github.com/cybersemics/em/issues/4722
// The iOS three-finger-swipe and shake-to-undo gestures dispatch a cancelable beforeinput event with
// inputType 'historyUndo' on the focused editable. em must intercept it and route it to its own undo so
// that structural actions (e.g. creating a new thought) are reverted from Redux, rather than falling
// through to WebKit's text-only native undo, which mutates the contenteditable directly and leaves the
// newly created thought in place.
it('routes a native historyUndo to em undo, reverting thought creation', async () => {
  await newThought('hello')

  // simulate the native undo gesture
  await page.evaluate(() => {
    document.activeElement?.dispatchEvent(
      new InputEvent('beforeinput', { inputType: 'historyUndo', bubbles: true, cancelable: true }),
    )
  })

  // the newly created thought should be removed entirely, leaving an empty thoughtspace
  await waitUntil(() => !document.querySelector('[data-editable]'))

  const exported = await exportThoughts()
  expect(exported).toBe('')
})
