import { KnownDevices } from 'puppeteer'
import newThoughtCommand from '../../../commands/newThought'
import clickThought from '../helpers/clickThought'
import exportThoughts from '../helpers/exportThoughts'
import gesture from '../helpers/gesture'
import getCaretOffset from '../helpers/getCaretOffset'
import getEditingText from '../helpers/getEditingText'
import keyboard from '../helpers/keyboard'
import press from '../helpers/press'
import setSelection from '../helpers/setSelection'
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

/** Dispatches a native undo/redo beforeinput event on the thought currently being edited, as iOS does for a three-finger swipe or shake-to-undo. */
const dispatchNativeHistory = (inputType: 'historyUndo' | 'historyRedo') =>
  page.evaluate(type => {
    const editable = document.querySelector('[data-editing=true] [data-editable]')
    editable?.dispatchEvent(new InputEvent('beforeinput', { inputType: type, bubbles: true, cancelable: true }))
  }, inputType)

// iOS three-finger swipe and shake-to-undo dispatch a beforeinput event with inputType historyUndo/historyRedo rather than Cmd+Z.
// Left to run natively, WebKit's contentEditable undo mutates the DOM out of sync with Redux (duplicating text, e.g. an autocorrected
// word and its original both re-inserted on redo). Verify these events are intercepted and routed through the app's undo/redo. (#4477)
it('Native undo/redo beforeinput (iOS three-finger swipe / shake-to-undo) routes through the app undo/redo', async () => {
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

  expect(await getEditingText()).toBe('hello world')

  // native undo (dispatched as iOS does, not via Cmd+Z)
  await dispatchNativeHistory('historyUndo')
  expect(await getEditingText()).toBe('hello')

  // native redo restores the edit exactly, without duplicating text
  await dispatchNativeHistory('historyRedo')
  expect(await getEditingText()).toBe('hello world')
})

// https://github.com/cybersemics/em/pull/4692#pullrequestreview-4863986059
it.skip('Native undo places the caret at the end of the restored thought', async () => {
  // create a thought "correct"
  await press('Enter')
  await keyboard.type('correct')

  // create a thought "a"
  await press('Enter')
  await keyboard.type('a')

  // tap into the middle of the thought, then replace the first letter as the iOS keyboard does when it autocorrects a word
  await clickThought('correct')
  await setSelection(0, 1)
  await keyboard.type('C')
  expect(await getEditingText()).toBe('Correct')

  // native undo (dispatched as iOS does, not via Cmd+Z)
  await dispatchNativeHistory('historyUndo')
  expect(await getEditingText()).toBe('correct')
  expect(await getCaretOffset()).toBe('correct'.length)
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
