import colors from '../../../colors.config'
import rgbToHex from '../../../util/rgbToHex'
import rgbaToHex from '../../../util/rgbaToHex'
import click from '../helpers/click'
import clickThought from '../helpers/clickThought'
import clickToolbar from '../helpers/clickToolbar'
import extractColor from '../helpers/extractColor'
import getBulletColor from '../helpers/getBulletColor'
import getEditingText from '../helpers/getEditingText'
import getSelection from '../helpers/getSelection'
import getSuperscriptColor from '../helpers/getSuperScriptColor'
import keyboard from '../helpers/keyboard'
import multiselectThoughts from '../helpers/multiselectThoughts'
import newThought from '../helpers/newThought'
import paste from '../helpers/paste'
import press from '../helpers/press'
import setSelection from '../helpers/setSelection'
import waitForCursor from '../helpers/waitForCursor'
import waitForEditable from '../helpers/waitForEditable'
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

/** Returns the background that actually paints behind the code text of the thought being edited, i.e. the nearest
 * self-or-ancestor of the code element that is not transparent. */
const codeBackgroundColor = () =>
  page.evaluate(() => {
    const code = document.querySelector('[data-editing=true] [data-editable] code')
    if (!code) throw new Error('No code element found in the editing thought')
    for (let el: Element | null = code; el; el = el.parentElement) {
      const backgroundColor = window.getComputedStyle(el).backgroundColor
      if (backgroundColor && backgroundColor !== 'transparent' && !backgroundColor.startsWith('rgba(0, 0, 0, 0'))
        return backgroundColor
    }
    return null
  })

vi.setConfig({ testTimeout: 60000, hookTimeout: 60000 })

it('Set the text color of the text and bullet', async () => {
  const importText = `
  - Labrador
  - Golden Retriever`

  await paste(importText)

  await clickThought('Golden Retriever')

  await clickToolbar('Text Color', 'text color swatches', 'blue')

  const cursorText = await getEditingText()
  const bulletColor = await getBulletColor()
  const result = extractColor(cursorText!)
  expect(rgbToHex(bulletColor!)).toBe(rgbaToHex(colors.light.blue))
  expect(result?.color).toBe(rgbaToHex(colors.light.blue))
  expect(result?.backgroundColor).toBe(null)
})

it('Applies a text color set on an empty thought to the text typed into it', async () => {
  await newThought()

  await clickToolbar('Text Color', 'text color swatches', 'green')

  // The placeholder previews the color that the typed text will take.
  const placeholderColor = await page.evaluate(() => {
    const editable = document.querySelector('[data-editing=true] [data-editable]')
    if (!editable) throw new Error('Editing thought not found')
    return getComputedStyle(editable, '::before').color
  })
  expect(rgbToHex(placeholderColor)).toBe(rgbaToHex(colors.light.green))

  await keyboard.type('Hello')

  await waitForEditable(`<font color="${rgbaToHex(colors.light.green)}">Hello</font>`)

  const bulletColor = await getBulletColor()
  expect(rgbToHex(bulletColor!)).toBe(rgbaToHex(colors.light.green))
})

it('Bullet keeps the font color after deleting all text without moving the cursor', async () => {
  const importText = `
    - hello`

  await paste(importText)

  await clickThought('hello')

  await clickToolbar('Text Color', 'text color swatches', 'red')
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
  const importText = `
    - hello`

  await paste(importText)

  await clickThought('hello')

  await clickToolbar('Text Color', 'text color swatches', 'red')
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
  await clickToolbar('Text Color', 'text color swatches', 'blue')

  let bulletColor = await getBulletColor()
  expect(rgbToHex(bulletColor!)).toBe(rgbaToHex(colors.light.blue))

  // apply Upper Case; the bullet should still match the font color (markup must not be corrupted)
  await clickToolbar('Letter Case', 'UpperCase')

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
  await clickToolbar('Text Color', 'background color swatches', 'green')

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
  await clickToolbar('Text Color', 'background color swatches', 'green')
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
  await clickToolbar('Text Color', 'text color swatches', 'blue')

  // Verify bullet color remains default and only substring is colored
  const bulletColor = await getBulletColor()
  expect(bulletColor).toBe(null)
})

it('remove all formatting from the thought', async () => {
  const importText = `
  - Labrador`

  await paste(importText)

  await clickThought('Labrador')
  // Apply formats like Bold, Italic, Underline, Text color etc.
  await clickToolbar('Bold')
  await clickToolbar('Italic')
  await clickToolbar('Underline')
  await clickToolbar('Strikethrough')
  await clickToolbar('Text Color', 'text color swatches', 'blue')

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
  await clickToolbar('Text Color', 'text color swatches', 'red')

  const supColor1 = await getSuperscriptColor()
  expect(supColor1).toBe(null) // Superscript should remain uncolored for partial text coloring

  // Test 2: Verify superscript color when entire thought is colored
  await clickThought('k')
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
  await clickToolbar('Context View')

  // Click the green 'b' context. clickThought matches the editable's innerHTML, which is why the color markup has to
  // be included: after 'b' is colored, its value is no longer the bare 'b' that clickThought('b') would look for.
  await clickThought('<font color="#00d688">b</font>')

  // The superscript is only read from the thought under the cursor, so wait for the click to land before reading it.
  await waitForCursor('<font color="#00d688">b</font>')

  const supColor3 = await getSuperscriptColor()
  expect(supColor3).toBeTruthy()
  expect(rgbToHex(supColor3!)).toBe(rgbaToHex(colors.light.green)) // Superscript should match the green color in context view
})

it('Clicking on a formatting tag does not close color dropdown', async () => {
  const importText = `
  - Golden Retriever`

  await paste(importText)

  await clickThought('Golden Retriever')

  await clickToolbar('Text Color', 'text color swatches', 'blue')
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
  await clickToolbar('Text Color', 'background color swatches', 'green')

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
  await clickToolbar('Text Color', 'background color swatches', 'green')

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
  await clickToolbar('Text Color', 'text color swatches', 'red')

  const thought = await getEditingText()
  expect(thought).toBe('<font color="#ff573d">some formatted text</font>')
})

// Tests whether selected is false in the ColorPicker for background color
it('Can change the background color of a thought that already has the same background color applied to part of its text', async () => {
  await paste(`
    - some <font color="#000000" style="background-color: rgb(255, 87, 61);">formatted</font> text
  `)

  // change the background color on the thought
  await clickToolbar('Text Color', 'background color swatches', 'red')

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
  await clickToolbar('Text Color', 'text color swatches', 'red')

  const note = await getFirstNoteText()
  expect(note).toBe('<font color="#ff573d">some formatted text</font>')
})

it('Set the text color via keyboard shortcut (Cmd + Option + 2 = orange)', async () => {
  const importText = `
  - Labrador
  - Golden Retriever`

  await paste(importText)

  await clickThought('Golden Retriever')

  // Cmd + Option + 2 applies the third text swatch (orange)
  await press('2', { meta: true, alt: true })

  const cursorText = await getEditingText()
  const bulletColor = await getBulletColor()
  const result = extractColor(cursorText!)
  expect(rgbToHex(bulletColor!)).toBe(rgbaToHex(colors.light.orange))
  expect(result?.color).toBe(rgbaToHex(colors.light.orange))
  expect(result?.backgroundColor).toBe(null)
})

it('Set the background color via keyboard shortcut (Alt + 3 = yellow)', async () => {
  const importText = `
    - Labrador
    - Golden Retriever`

  await paste(importText)

  await clickThought('Golden Retriever')

  // Alt + 3 applies the fourth background swatch (yellow)
  await press('3', { alt: true })

  const cursorText = await getEditingText()
  const bulletColor = await getBulletColor()
  const result = extractColor(cursorText!)
  expect(rgbToHex(bulletColor!)).toBe(rgbaToHex(colors.light.yellow))
  expect(result?.backgroundColor && rgbToHex(result.backgroundColor)).toBe(rgbaToHex(colors.light.yellow))
})

it('Clear the text color via the default keyboard shortcut (Cmd + Option + 0)', async () => {
  const importText = `
  - Labrador
  - Golden Retriever`

  await paste(importText)

  await clickThought('Golden Retriever')

  // apply orange, then reset to the default text color with Cmd + Option + 0
  await press('2', { meta: true, alt: true })
  await press('0', { meta: true, alt: true })

  const result = await getEditingText()
  expect(result).toBe('Golden Retriever')
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

  await clickToolbar('Text Color')

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

  await clickToolbar('Text Color')

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

it('Set text color with multicursor selection', async () => {
  const importText = `
  - Labrador
  - Golden Retriever`

  await paste(importText)

  // Ctrl+click both thoughts to add them both to the multicursor set.
  await multiselectThoughts(['Labrador', 'Golden Retriever'])

  await clickToolbar('Text Color', 'text color swatches', 'blue')

  // Verify the cursor thought (Golden Retriever) has the correct color.
  const goldenText = await getEditingText()
  expect(extractColor(goldenText!)?.color).toBe(rgbaToHex(colors.light.blue))

  // Navigate to Labrador and verify its color was also applied.
  await press('ArrowUp')
  const labradorText = await getEditingText()
  expect(extractColor(labradorText!)?.color).toBe(rgbaToHex(colors.light.blue))
})

it('Set background color with multicursor selection', async () => {
  const importText = `
  - Labrador
  - Golden Retriever`

  await paste(importText)

  // Ctrl+click both thoughts to add them both to the multicursor set.
  await multiselectThoughts(['Labrador', 'Golden Retriever'])

  await clickToolbar('Text Color', 'background color swatches', 'green')

  // Verify the cursor thought (Golden Retriever) has the correct background color.
  const goldenText = await getEditingText()
  const goldenBgColor = extractColor(goldenText!)?.backgroundColor
  expect(goldenBgColor && rgbToHex(goldenBgColor)).toBe(rgbaToHex(colors.light.green))

  // Navigate to Labrador and verify its background color was also applied.
  await press('ArrowUp')
  const labradorText = await getEditingText()
  const labradorBgColor = extractColor(labradorText!)?.backgroundColor
  expect(labradorBgColor && rgbToHex(labradorBgColor)).toBe(rgbaToHex(colors.light.green))
})

// https://github.com/cybersemics/em/issues/4234
it('Set the background color of text that is marked as code', async () => {
  const importText = `
  - Hello beautiful people`

  await paste(importText)

  await clickThought('Hello beautiful people')

  await setSelection(6, 15)
  await press('K', { meta: true })
  await waitForEditable('Hello <code>beautiful</code> people')

  await clickToolbar('Text Color', 'background color swatches', 'red')
  await nextFrame()

  const background = await codeBackgroundColor()
  expect(background && rgbToHex(background)).toBe(rgbaToHex(colors.light.red))
})

// https://github.com/cybersemics/em/issues/4234
it('Set the background color of text that is marked as code with the =style attribute', async () => {
  const importText = `
  - Hello beautiful people
    - =style
      - background-color
        - red`

  await paste(importText)

  await clickThought('Hello beautiful people')

  await setSelection(6, 15)
  await press('K', { meta: true })
  await waitForEditable('Hello <code>beautiful</code> people')
  await nextFrame()

  const background = await codeBackgroundColor()
  expect(background && rgbToHex(background)).toBe(rgbaToHex(colors.light.red))
})
