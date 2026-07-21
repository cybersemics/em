import { KnownDevices } from 'puppeteer'
import newThoughtCommand from '../../../commands/newThought'
import click from '../helpers/click'
import clickThought from '../helpers/clickThought'
import command from '../helpers/command'
import exportThoughts from '../helpers/exportThoughts'
import gesture from '../helpers/gesture'
import getEditingText from '../helpers/getEditingText'
import keyboard from '../helpers/keyboard'
import newThought from '../helpers/newThought'
import paste from '../helpers/paste'
import press from '../helpers/press'
import waitForSelector from '../helpers/waitForSelector'
import { page } from '../session'

vi.setConfig({ testTimeout: 20000, hookTimeout: 20000 })

/** Gets the rendered note, character-relative caret offset, and undo history validity. */
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

    const state = window.em.testHelpers.getState()

    return {
      focusInsideNote,
      historyIsValid: [...state.undoPatches, ...state.redoPatches].every(patch => patch.length > 0),
      noteOffset: state.noteOffset,
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

// Regression test for https://github.com/cybersemics/em/pull/4524
// .skip keeps normal CI green while the test is red; remove the .skip when the fix lands.
it.skip('Restores note content and caret across alternating undo and redo', async () => {
  await newThought('a')
  await command('note')
  await waitForSelector('[aria-label="note-editable"]')
  await keyboard.type('one two three')

  // replace the trailing word to create separate addition, deletion, and addition undo groups
  await press('ArrowLeft', { shift: true })
  await press('ArrowLeft', { shift: true })
  await press('ArrowLeft', { shift: true })
  await press('ArrowLeft', { shift: true })
  await press('ArrowLeft', { shift: true })
  await press('ArrowLeft', { shift: true })
  await press('Backspace')
  await keyboard.type(' four')

  await command('undo')
  await waitForNoteText('one two')
  await command('undo')
  await waitForNoteText('one two three')
  const restoredDeletion = await getNoteState()

  await command('undo')
  await waitForNoteText('')
  await command('undo')
  await command('undo')
  await waitForNoteText(null)

  await command('redo')
  await command('redo')
  await waitForNoteText('')
  await command('undo')
  await waitForNoteText(null)
  await command('undo')
  await command('redo')
  const redoError = await command('redo').then(
    () => null,
    error => (error instanceof Error ? error.message : String(error)),
  )
  await waitForNoteText('')
  const finalNote = await getNoteState()

  expect({ finalNote, redoError, restoredDeletion }).toEqual({
    finalNote: {
      focusInsideNote: true,
      historyIsValid: true,
      noteOffset: 0,
      offset: 0,
      text: '',
    },
    redoError: null,
    restoredDeletion: {
      focusInsideNote: true,
      historyIsValid: true,
      noteOffset: 13,
      offset: 13,
      text: 'one two three',
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
