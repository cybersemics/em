import { KnownDevices } from 'puppeteer'
import newThoughtCommand from '../../../commands/newThought'
import clickThought from '../helpers/clickThought'
import command from '../helpers/command'
import deviceEmulation from '../helpers/deviceEmulation'
import exportThoughts from '../helpers/exportThoughts'
import gesture from '../helpers/gesture'
import getCaretOffset from '../helpers/getCaretOffset'
import getEditingText from '../helpers/getEditingText'
import keyboard from '../helpers/keyboard'
import newThought from '../helpers/newThought'
import paste from '../helpers/paste'
import press from '../helpers/press'
import setSelection from '../helpers/setSelection'
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

/** Gets the current native selection within the rendered note. */
const getNoteSelection = () =>
  page.evaluate(() => {
    const note = document.querySelector('[aria-label="note-editable"]')
    const selection = window.getSelection()

    return {
      isCollapsed: selection?.isCollapsed ?? null,
      selectedText: selection?.toString() ?? null,
      selectionInsideNote:
        !!note &&
        !!selection?.anchorNode &&
        !!selection.focusNode &&
        note.contains(selection.anchorNode) &&
        note.contains(selection.focusNode),
    }
  })

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

// https://github.com/cybersemics/em/pull/4524#issuecomment-4899593086
it('restores the note caret after undo so Backspace edits the note without merging thoughts', async () => {
  await paste(`
    - One
    - Two
      - =note
        - The world of birds
  `)

  const note = await waitForSelector('[aria-label="note-editable"]')
  if (!note) throw new Error('Note editable not found')
  await note.click()
  await press('Home')
  await press('ArrowRight')
  await press('ArrowRight')
  await press('ArrowRight')
  await press('ArrowRight')
  await press('ArrowRight')
  await press('ArrowRight')
  await press('ArrowRight')
  await press('ArrowRight')
  await press('ArrowRight')
  await press('Backspace')
  await waitForNoteText('The worl of birds')

  await command('undo')
  await waitForNoteText('The world of birds')
  const undone = await getNoteState()

  await press('Backspace')
  const afterBackspace = await getNoteState()

  const exported = (await exportThoughts()).trimEnd()
  expect({ afterBackspace, exported, undone }).toEqual({
    afterBackspace: {
      focusInsideNote: true,
      offset: 8,
      text: 'The worl of birds',
    },
    exported: `
- One
- Two
  - =note
    - The worl of birds`,
    undone: {
      focusInsideNote: true,
      offset: 9,
      text: 'The world of birds',
    },
  })
})

// https://github.com/cybersemics/em/pull/4524#issuecomment-4936720071
it('keeps a double-clicked word selected within a note', async () => {
  await paste(`
    - One
      - =note
        - Hello world
  `)

  const note = await waitForSelector('[aria-label="note-editable"]')
  if (!note) throw new Error('Note editable not found')
  const boundingBox = await note.boundingBox()
  if (!boundingBox) throw new Error('Note bounding box not found')

  await page.mouse.click(boundingBox.x + 1, boundingBox.y + boundingBox.height / 2, { count: 2 })
  await page.evaluate(
    () => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))),
  )

  expect(await getNoteSelection()).toEqual({
    isCollapsed: false,
    selectedText: 'Hello',
    selectionInsideNote: true,
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
it('Native undo places the caret at the end of the restored thought', async () => {
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

describe('mobile only', () => {
  deviceEmulation.useForSuite(KnownDevices['iPhone 15 Pro'])

  // We have to test this in puppeteer because chained commands are executed as separate commands at a higher level than action-creators and undone with an ad hoc mergeNext property on the action.
  it('Undo Select All + Categorize chained command in one step', async () => {
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
})
