import { KnownDevices } from 'puppeteer'
import newThoughtCommand from '../../../commands/newThought'
import clickThought from '../helpers/clickThought'
import command from '../helpers/command'
import exportThoughts from '../helpers/exportThoughts'
import gesture from '../helpers/gesture'
import getEditingText from '../helpers/getEditingText'
import keyboard from '../helpers/keyboard'
import newThought from '../helpers/newThought'
import press from '../helpers/press'
import waitForSelector from '../helpers/waitForSelector'
import { page } from '../session'

vi.setConfig({ testTimeout: 20000, hookTimeout: 20000 })

/** Gets the rendered note and character-relative caret offset. */
const getNoteState = () =>
  page.evaluate(() => {
    const note = document.querySelector('[aria-label="note-editable"]')
    const selection = window.getSelection()
    const focusInsideNote = !!selection?.focusNode && !!note?.contains(selection.focusNode)
    const range = document.createRange()

    if (note && selection?.focusNode && focusInsideNote) {
      range.selectNodeContents(note)
      range.setEnd(selection.focusNode, selection.focusOffset)
    }

    return {
      focusInsideNote,
      offset: note && focusInsideNote ? range.toString().length : null,
      text: note?.textContent ?? null,
    }
  })

/** Waits for the rendered note to match the expected text, or to be removed when null. */
const waitForNoteText = (text: string | null) =>
  page.waitForFunction(
    expected => {
      const note = document.querySelector('[aria-label="note-editable"]')
      return expected === null ? !note : note?.textContent === expected
    },
    {},
    text,
  )

// https://github.com/cybersemics/em/issues/4479
it('undoes and redoes contiguous note typing with its caret', async () => {
  await newThought('a')
  await command('note')
  await waitForSelector('[aria-label="note-editable"]')
  await keyboard.type('abc')
  await waitForNoteText('abc')

  await command('undo')
  await waitForNoteText('')
  const undone = await getNoteState()

  await command('redo')
  await waitForNoteText('abc')
  const redone = await getNoteState()

  expect({ redone, undone }).toEqual({
    redone: {
      focusInsideNote: true,
      offset: 3,
      text: 'abc',
    },
    undone: {
      focusInsideNote: true,
      offset: 0,
      text: '',
    },
  })
})

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
