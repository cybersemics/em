import colors from '../../../colors.config'
import rgbToHex from '../../../util/rgbToHex'
import rgbaToHex from '../../../util/rgbaToHex'
import click from '../helpers/click'
import clickThought from '../helpers/clickThought'
import extractColor from '../helpers/extractColor'
import getBulletColor from '../helpers/getBulletColor'
import getEditingText from '../helpers/getEditingText'
import getSelection from '../helpers/getSelection'
import getSuperscriptColor from '../helpers/getSuperScriptColor'
import keyboard from '../helpers/keyboard'
import newThought from '../helpers/newThought'
import paste from '../helpers/paste'
import press from '../helpers/press'
import selectionWasDropped from '../helpers/selectionWasDropped'
import setSelection from '../helpers/setSelection'
import waitForEditable from '../helpers/waitForEditable'
import waitUntil from '../helpers/waitUntil'
import watchSelection from '../helpers/watchSelection'
import { page } from '../session'

/** Click the first note. Assumes that there will be only a single note. */
const clickFirstNote = () => click('[aria-label="note-editable"]')

/** Retrieve the innerHTML of the first note on the page. Assumes that there will be only a single note. */
const getFirstNoteText = () => page.evaluate(() => document.querySelector('[aria-label="note-editable"]')?.innerHTML)

/** Selects all contents of the editable cursor thought, including nested formatting tags. */
const selectAllEditingText = () =>
  page.evaluate(() => {
    const editable = document.querySelector('[data-editing=true] [data-editable]')
    if (!editable) throw new Error('No editing editable found')

    const range = document.createRange()
    range.selectNodeContents(editable)
    const selection = window.getSelection()
    selection?.removeAllRanges()
    selection?.addRange(range)
  })

/** Sets a collapsed caret at the given plain-text offset within the first note. */
const setNoteCaret = (offset: number) =>
  page.evaluate((offset: number) => {
    const note = document.querySelector('[aria-label="note-editable"]')
    const textNode = note?.firstChild
    if (!textNode) throw new Error('No text node found in note editable')
    const range = document.createRange()
    range.setStart(textNode, offset)
    range.setEnd(textNode, offset)
    const selection = window.getSelection()
    selection?.removeAllRanges()
    selection?.addRange(range)
  }, offset)

/** Waits one frame for selectionchange-driven command state to propagate. */
const nextFrame = () => page.evaluate(() => new Promise(requestAnimationFrame))

vi.setConfig({ testTimeout: 60000, hookTimeout: 60000 })

it('Set the text color of the text and bullet', async () => {
  const importText = `
  - Labrador
  - Golden Retriever`

  await paste(importText)

  await clickThought('Golden Retriever')

  await click('[data-testid="toolbar-icon"][aria-label="Text Color"]')
  await click('[aria-label="text color swatches"] [aria-label="blue"]')

  const cursorText = await getEditingText()
  const bulletColor = await getBulletColor()
  const result = extractColor(cursorText!)
  expect(rgbToHex(bulletColor!)).toBe(rgbaToHex(colors.light.blue))
  expect(result?.color).toBe(rgbaToHex(colors.light.blue))
  expect(result?.backgroundColor).toBe(null)
})

it('Bullet keeps the font color after deleting all text without moving the cursor', async () => {
  await newThought('hello')

  await click('[data-testid="toolbar-icon"][aria-label="Text Color"]')
  await click('[aria-label="text color swatches"] [aria-label="red"]')
  await waitForEditable('<font color="#ff573d">hello</font>')

  const bulletColorBeforeDelete = await getBulletColor()
  expect(rgbToHex(bulletColorBeforeDelete!)).toBe(rgbaToHex(colors.light.red))

  await selectAllEditingText()
  await press('Backspace')
  await waitForEditable('')
  await nextFrame()

  const bulletColorAfterDelete = await getBulletColor()
  expect(rgbToHex(bulletColorAfterDelete!)).toBe(rgbaToHex(colors.light.red))

  await keyboard.type('a')
  await waitForEditable('<font color="#ff573d">a</font>')

  const bulletColorAfterTyping = await getBulletColor()
  expect(rgbToHex(bulletColorAfterTyping!)).toBe(rgbaToHex(colors.light.red))
})

it('Bullet clears the font color after deleting all text and moving the cursor away', async () => {
  await newThought('hello')

  await click('[data-testid="toolbar-icon"][aria-label="Text Color"]')
  await click('[aria-label="text color swatches"] [aria-label="red"]')
  await waitForEditable('<font color="#ff573d">hello</font>')

  await selectAllEditingText()
  await press('Backspace')
  await waitForEditable('')
  await nextFrame()

  const bulletColorAfterDelete = await getBulletColor()
  expect(rgbToHex(bulletColorAfterDelete!)).toBe(rgbaToHex(colors.light.red))

  await press('Enter')
  await nextFrame()

  const newThoughtBulletColor = await getBulletColor()
  expect(newThoughtBulletColor).toBe(null)

  await press('ArrowUp')
  await nextFrame()

  const emptyThoughtBulletColor = await getBulletColor()
  expect(emptyThoughtBulletColor).toBe(null)

  await keyboard.type('a')
  await waitForEditable('a')

  const bulletColorAfterTyping = await getBulletColor()
  expect(bulletColorAfterTyping).toBe(null)
})

it('Bullet keeps the font color after applying Upper Case', async () => {
  const importText = `
    - hello`

  await paste(importText)

  await clickThought('hello')

  // apply a font color
  await click('[data-testid="toolbar-icon"][aria-label="Text Color"]')
  await click('[aria-label="text color swatches"] [aria-label="blue"]')

  let bulletColor = await getBulletColor()
  expect(rgbToHex(bulletColor!)).toBe(rgbaToHex(colors.light.blue))

  // apply Upper Case; the bullet should still match the font color (markup must not be corrupted)
  await click('[data-testid="toolbar-icon"][aria-label="Letter Case"]')
  await click('[aria-label="letter case swatches"] [aria-label="UpperCase"]')

  const cursorText = await getEditingText()
  expect(cursorText).toContain('HELLO')

  bulletColor = await getBulletColor()
  expect(rgbToHex(bulletColor!)).toBe(rgbaToHex(colors.light.blue))
})

it('Set the background color of the text', async () => {
  const importText = `
    - Labrador
    - Golden Retriever`

  await paste(importText)

  await clickThought('Golden Retriever')
  await click('[data-testid="toolbar-icon"][aria-label="Text Color"]')
  await click('[aria-label="background color swatches"] [aria-label="green"]')

  const cursorText = await getEditingText()
  const bulletColor = await getBulletColor()
  const result = extractColor(cursorText!)
  expect(rgbToHex(bulletColor!)).toBe(rgbaToHex(colors.light.green))
  expect(result?.backgroundColor && rgbToHex(result.backgroundColor)).toBe(rgbaToHex(colors.light.green))
})

it('Bullet tracks the font color on a numeric thought that has a background color', async () => {
  const importText = `
    - 123`

  await paste(importText)

  await clickThought('123')
  let cursorText = await getEditingText()
  expect(extractColor(cursorText!)?.backgroundColor).toBe(null)

  // apply a background color first
  await click('[data-testid="toolbar-icon"][aria-label="Text Color"]')
  await click('[aria-label="background color swatches"] [aria-label="green"]')
  cursorText = await getEditingText()
  const backStyle = extractColor(cursorText!)
  expect(backStyle?.backgroundColor && rgbToHex(backStyle.backgroundColor)).toBe(rgbaToHex(colors.light.green))

  // then apply a font color, which should clear the background and tint the bullet to match the font color
  await click('[aria-label="text color swatches"] [aria-label="blue"]')
  cursorText = await getEditingText()
  const style = extractColor(cursorText!)
  expect(style?.color).toBe(rgbaToHex(colors.light.blue))
  expect(style?.backgroundColor).toBe(null)

  const bulletColor = await getBulletColor()
  expect(rgbToHex(bulletColor!)).toBe(rgbaToHex(colors.light.blue))
})

it('Bullet remains the default color when a substring color is set', async () => {
  const importText = `
  - Labrador
  - Golden Retriever`

  await paste(importText)

  await clickThought('Golden Retriever')

  await setSelection(0, 6)
  // Set color for selected text
  await click('[data-testid="toolbar-icon"][aria-label="Text Color"]')
  await click('[aria-label="text color swatches"] [aria-label="blue"]')

  // Verify bullet color remains default and only substring is colored
  const bulletColor = await getBulletColor()
  expect(bulletColor).toBe(null)
})

it('Selection remains active after applying a font color to part of the text', async () => {
  const importText = `
  - Labrador
  - Golden Retriever`

  await paste(importText)

  await clickThought('Golden Retriever')

  await setSelection(0, 6)
  // Set text color for the selected substring
  await click('[data-testid="toolbar-icon"][aria-label="Text Color"]')
  await click('[aria-label="text color swatches"] [aria-label="blue"]')

  // The active selection should be preserved (not dismissed) after applying the font color
  const selectedText = await getSelection().toString()
  expect(selectedText).toBe('Golden')
})

it('Selection remains active after applying a font color to text that has a background color elsewhere', async () => {
  const importText = `
  - Labrador
  - Golden Retriever`

  await paste(importText)

  await clickThought('Golden Retriever')

  // Apply a background color to the first substring ("Golden")
  await setSelection(0, 6)
  await click('[data-testid="toolbar-icon"][aria-label="Text Color"]')
  await click('[aria-label="background color swatches"] [aria-label="green"]')

  // Select a different substring ("Retriever"), which now lives in a separate text node after the colored span
  await setSelection('Retriever')

  // Apply a font color to the second substring
  await click('[aria-label="text color swatches"] [aria-label="blue"]')

  // The active selection should be preserved (not dismissed) even though the thought already has a background color (#4275)
  const selectedText = await getSelection().toString()
  expect(selectedText).toBe('Retriever')
})

it('Applying a font color clears a background color on the overlapping part of the selection', async () => {
  const importText = `
  - Labrador
  - Golden Retriever`

  await paste(importText)

  await clickThought('Golden Retriever')

  // Apply a background color to the first substring ("Golden")
  await setSelection(0, 6)
  await click('[data-testid="toolbar-icon"][aria-label="Text Color"]')
  await click('[aria-label="background color swatches"] [aria-label="green"]')

  // Select a range that overlaps the colored substring ("Golden Ret"), spanning the colored span and the following text node
  await setSelection('Golden Ret')

  // Apply a font color over the overlapping selection
  await click('[aria-label="text color swatches"] [aria-label="blue"]')

  // The background color on the overlapping substring should be cleared, leaving only the font color (#4275)
  const cursorText = await getEditingText()
  expect(extractColor(cursorText!).backgroundColor).toBe(null)
  expect(extractColor(cursorText!).color).toBe(rgbaToHex(colors.light.blue))
})

it('Selection remains active after applying a font color to text that already has a background color', async () => {
  const importText = `
  - Labrador
  - Golden Retriever`

  await paste(importText)

  await clickThought('Golden Retriever')

  // Apply a background color to the substring "Golden"
  await setSelection(0, 6)
  await click('[data-testid="toolbar-icon"][aria-label="Text Color"]')
  await click('[aria-label="background color swatches"] [aria-label="green"]')

  // Apply a font color to the same selection without clearing it
  await click('[aria-label="text color swatches"] [aria-label="blue"]')

  // The active selection should be preserved (not dismissed) even though the font color cleared the
  // background color, which forces a re-render (#4275)
  const selectedText = await getSelection().toString()
  expect(selectedText).toBe('Golden')

  // The font color should override the background color, leaving only the font color
  const cursorText = await getEditingText()
  expect(extractColor(cursorText!).backgroundColor).toBe(null)
  expect(extractColor(cursorText!).color).toBe(rgbaToHex(colors.light.blue))
})

// https://github.com/cybersemics/em/issues/4275
it('Selection is not dropped when applying a font color over a background color', async () => {
  const importText = `
  - Labrador
  - Golden Retriever`

  await paste(importText)

  await clickThought('Golden Retriever')

  // Apply a background color to the substring "Golden"
  await setSelection(0, 6)
  await click('[data-testid="toolbar-icon"][aria-label="Text Color"]')
  await click('[aria-label="background color swatches"] [aria-label="green"]')
  await waitUntil(() => window.getSelection()?.toString() === 'Golden')

  // Apply a font color to the same selection without clearing it
  await watchSelection()
  await click('[aria-label="text color swatches"] [aria-label="blue"]')
  await waitUntil(() => !document.querySelector('[data-editing=true] [data-editable] font')?.getAttribute('style'))

  // The selection must stay active throughout, rather than being dropped and re-created: Android only shows the
  // native selection handles and context menu for a selection that has never been dropped
  expect(await selectionWasDropped()).toBe(false)
  expect(await getSelection().toString()).toBe('Golden')
})

it('Applying a font color overrides a background color on a selection that contains an existing font color', async () => {
  await paste('Hello world of beautiful world')

  await clickThought('Hello world of beautiful world')

  // Apply a font color to the first "world"
  await setSelection('world')
  await click('[data-testid="toolbar-icon"][aria-label="Text Color"]')
  await click('[aria-label="text color swatches"] [aria-label="green"]')

  // Apply a background color to "world of beautiful", which contains the existing font color
  await setSelection('world of beautiful')
  await click('[aria-label="background color swatches"] [aria-label="green"]')

  // Apply a font color to the same selection
  await setSelection('world of beautiful')
  await click('[aria-label="text color swatches"] [aria-label="green"]')

  // The font color should override the background color, leaving only the font color (#4275)
  const cursorText = await getEditingText()
  expect(extractColor(cursorText!).backgroundColor).toBe(null)
  expect(extractColor(cursorText!).color).toBe(rgbaToHex(colors.light.green))

  // The active selection should be preserved (not dismissed)
  const selectedText = await getSelection().toString()
  expect(selectedText).toBe('world of beautiful')
})

it('remove all formatting from the thought', async () => {
  const importText = `
  - Labrador`

  await paste(importText)

  await clickThought('Labrador')
  // Apply formats like Bold, Italic, Underline, Text color etc.
  await click('[data-testid="toolbar-icon"][aria-label="Bold"]')
  await click('[data-testid="toolbar-icon"][aria-label="Italic"]')
  await click('[data-testid="toolbar-icon"][aria-label="Underline"]')
  await click('[data-testid="toolbar-icon"][aria-label="Strikethrough"]')
  await click('[data-testid="toolbar-icon"][aria-label="Text Color"]')
  await click('[aria-label="text color swatches"] [aria-label="blue"]')

  await press('0', { meta: true }) // Remove Format.

  const thoughtValue = await getEditingText()
  expect(thoughtValue).toBe('Labrador')
})

it('Verify superscript colors in different views', async () => {
  const importText1 = `
    - k
    - k
    - hello world
    - hello world
    - a
      - m
        - x
    - v
      - b
        - m
          - y
    - c
      - b
    `
  await paste(importText1)

  // Test 1: Verify that partial text coloring doesn't affect superscript
  await clickThought('hello world')
  await setSelection(6, 11) // Select only "world" in "hello world"
  await click('[data-testid="toolbar-icon"][aria-label="Text Color"]')
  await click('[aria-label="text color swatches"] [aria-label="red"]')

  const supColor1 = await getSuperscriptColor()
  expect(supColor1).toBe(null) // Superscript should remain uncolored for partial text coloring

  // Test 2: Verify superscript color when entire thought is colored
  // Press Escape to clear the active text selection and close the color picker before navigating.
  // The picker popover overlaps the top thoughts, so it would otherwise intercept the click on 'k';
  // and a preserved selection keeps the picker open (it no longer collapses to a caret), so toggling
  // the toolbar button is not sufficient to close it (#4275).
  await press('Escape')
  await clickThought('k')
  await click('[data-testid="toolbar-icon"][aria-label="Text Color"]')
  await click('[aria-label="text color swatches"] [aria-label="blue"]')

  const supColor2 = await getSuperscriptColor()
  expect(supColor2).toBeTruthy()
  expect(rgbToHex(supColor2!)).toBe(rgbaToHex(colors.light.blue)) // Superscript should match thought color

  // Test 3: Set up nested thought colors for context view testing
  // Color parent thought 'v' red
  await clickThought('v')
  await click('[aria-label="text color swatches"] [aria-label="red"]')

  // Color child thought 'b' green
  await clickThought('b')
  await click('[aria-label="text color swatches"] [aria-label="green"]')

  // Switch to context view and verify superscript color
  await clickThought('a')
  await clickThought('m')
  await click('[data-testid="toolbar-icon"][aria-label="Context View"]')

  // ArrowDown to the green 'b' context. Keyboard traversal visits the first context and its child before reaching it.
  // TODO: Why does clickThought('b') not work here?
  await press('ArrowDown')
  await press('ArrowDown')
  await press('ArrowDown')
  const supColor3 = await getSuperscriptColor()
  expect(supColor3).toBeTruthy()
  expect(rgbToHex(supColor3!)).toBe(rgbaToHex(colors.light.green)) // Superscript should match the green color in context view
})

it('Clicking on a formatting tag does not close color dropdown', async () => {
  const importText = `
  - Golden Retriever`

  await paste(importText)

  await clickThought('Golden Retriever')

  await click('[data-testid="toolbar-icon"][aria-label="Text Color"]')
  await click('[aria-label="text color swatches"] [aria-label="blue"]')
  await clickThought('<font color="#00c7e6">Golden Retriever</font>')

  const textColorSwatch = await page.$('[aria-label="text color swatches"] [aria-label="blue"]')

  expect(textColorSwatch).toBeTruthy()
})

// Tests the ColorPicker selected value for a note
it('Toggle the background color of the note', async () => {
  await paste(`
    - a
      - =note
        - Note
  `)

  await clickFirstNote()
  await click('[data-testid="toolbar-icon"][aria-label="Text Color"]')
  await click('[aria-label="background color swatches"] [aria-label="green"]')

  const intermediate = await getFirstNoteText()
  expect(intermediate).toBe('<font color="#000000" style="background-color: rgb(0, 214, 136);">Note</font>')

  await click('[aria-label="background color swatches"] [aria-label="green"]')

  const result = await getFirstNoteText()
  expect(result).toBe('Note')
})

// Tests whether ColorPicker's selected flag differentiates between a thought and a note
it('A thought and a note can have the same background color', async () => {
  await paste(`
    - a
      - =note
        - Note
  `)

  // set the background color on the thought
  await clickThought('a')
  await click('[data-testid="toolbar-icon"][aria-label="Text Color"]')
  await click('[aria-label="background color swatches"] [aria-label="green"]')

  // set the background color on the note
  await clickFirstNote()
  await click('[aria-label="background color swatches"] [aria-label="green"]')

  const thought = await getEditingText()
  expect(thought).toBe('<font color="#000000" style="background-color: rgb(0, 214, 136);">a</font>')

  const note = await getFirstNoteText()
  expect(note).toBe('<font color="#000000" style="background-color: rgb(0, 214, 136);">Note</font>')
})

// Tests whether selected is false in the ColorPicker for foreground color
it('Can change the color of a thought that already has the same color applied to part of its text', async () => {
  await paste(`
    - some <font color="#ff573d">formatted</font> text
  `)

  // change the color on the thought
  await click('[data-testid="toolbar-icon"][aria-label="Text Color"]')
  await click('[aria-label="text color swatches"] [aria-label="red"]')

  const thought = await getEditingText()
  expect(thought).toBe('<font color="#ff573d">some formatted text</font>')
})

// Tests whether selected is false in the ColorPicker for background color
it('Can change the background color of a thought that already has the same background color applied to part of its text', async () => {
  await paste(`
    - some <font color="#000000" style="background-color: rgb(255, 87, 61);">formatted</font> text
  `)

  // change the background color on the thought
  await click('[data-testid="toolbar-icon"][aria-label="Text Color"]')
  await click('[aria-label="background color swatches"] [aria-label="red"]')

  const thought = await getEditingText()
  expect(thought).toBe('<font color="#000000" style="background-color: rgb(255, 87, 61);">some formatted text</font>')
})

// Tests whether selected is false in the ColorPicker for foreground color on a note
it('Can change the color of a note that already has the same color applied to part of its text', async () => {
  await paste(`
    - a
      - =note      
        - some formatted <font color="#ff573d">text</font>
  `)

  // change the color on the note
  await clickFirstNote()
  await click('[data-testid="toolbar-icon"][aria-label="Text Color"]')
  await click('[aria-label="text color swatches"] [aria-label="red"]')

  const note = await getFirstNoteText()
  expect(note).toBe('<font color="#ff573d">some formatted text</font>')
})

// https://github.com/cybersemics/em/issues/4630
it('caret stays in place when applying font color to a note that has a background color', async () => {
  await paste(`
    - One
      - =note
        - Welcome to the Jungle
  `)

  await clickFirstNote()

  // place the caret in the middle of the note text
  await setNoteCaret(10)

  await click('[data-testid="toolbar-icon"][aria-label="Text Color"]')

  // apply a background color to the whole note
  await click('[aria-label="background color swatches"] [aria-label="green"]')

  // apply a font color to the whole note, which removes the background color
  await click('[aria-label="text color swatches"] [aria-label="blue"]')

  // wait for the caret to settle after the note re-renders
  await nextFrame()
  await nextFrame()

  // the caret should stay where the user left off, not jump to the start or end of the note
  const offset = await getSelection().focusOffset
  expect(offset).toBe(10)
})

// https://github.com/cybersemics/em/issues/4630
it('caret stays in place when repeatedly applying font color over background color', async () => {
  await paste(`
    - One
      - =note
        - Welcome to the Jungle
  `)

  await clickFirstNote()

  // place the caret in the middle of the note text
  await setNoteCaret(10)

  await click('[data-testid="toolbar-icon"][aria-label="Text Color"]')

  // apply background then font color twice; the resolved caret offset is identical each time,
  // so the caret restoration must re-fire even when the offset does not change (#4630)
  await click('[aria-label="background color swatches"] [aria-label="green"]')
  await click('[aria-label="text color swatches"] [aria-label="red"]')
  await click('[aria-label="background color swatches"] [aria-label="green"]')
  await click('[aria-label="text color swatches"] [aria-label="red"]')

  // wait for the caret to settle after the note re-renders
  await nextFrame()
  await nextFrame()

  // the caret should still stay where the user left off, not jump to the end of the note
  const offset = await getSelection().focusOffset
  expect(offset).toBe(10)
})
