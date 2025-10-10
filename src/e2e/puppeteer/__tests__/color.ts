import colors from '../../../colors.config'
import rgbToHex from '../../../util/rgbToHex'
import rgbaToHex from '../../../util/rgbaToHex'
import click from '../helpers/click'
import clickThought from '../helpers/clickThought'
import getBulletColor from '../helpers/getBulletColor'
import getEditingText from '../helpers/getEditingText'
import getSuperscriptColor from '../helpers/getSuperScriptColor'
import paste from '../helpers/paste'
import press from '../helpers/press'
import setSelection from '../helpers/setSelection'

vi.setConfig({ testTimeout: 60000, hookTimeout: 60000 })

/**
 * Extract the Style of html string.
 */
const extractStyleProperty = (html: string) => {
  const colorMatch = html.match(/color=['"]?(#[0-9a-fA-F]{6}|[a-zA-Z]+)['"]?/)
  const backgroundColorMatch = html.match(/background-color:\s*([^;]+)/)

  const color = colorMatch ? colorMatch[1] : null
  const backgroundColor = backgroundColorMatch ? backgroundColorMatch[1].trim() : null
  return { color, backgroundColor }
}

describe('Color', () => {
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
    const result = extractStyleProperty(cursorText!)
    expect(rgbToHex(bulletColor!)).toBe(rgbaToHex(colors.light.blue))
    expect(result?.color).toBe(rgbaToHex(colors.light.blue))
    expect(result?.backgroundColor).toBe(null)
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
    const result = extractStyleProperty(cursorText!)
    expect(rgbToHex(bulletColor!)).toBe(rgbaToHex(colors.light.green))
    expect(result?.backgroundColor && rgbToHex(result.backgroundColor)).toBe(rgbaToHex(colors.light.green))
  })

  it('Clear the background color when selecting text color', async () => {
    const importText = `
      - Labrador
      - Golden Retriever`

    await paste(importText)

    await clickThought('Golden Retriever')
    let cursorText = await getEditingText()
    expect(extractStyleProperty(cursorText!)?.backgroundColor).toBe(null)

    await click('[data-testid="toolbar-icon"][aria-label="Text Color"]')
    await click('[aria-label="background color swatches"] [aria-label="green"]')
    cursorText = await getEditingText()
    let style = extractStyleProperty(cursorText!)
    expect(style?.backgroundColor && rgbToHex(style.backgroundColor)).toBe(rgbaToHex(colors.light.green))
    expect(style?.color).toBe(rgbaToHex(colors.light.black))

    await click('[aria-label="text color swatches"] [aria-label="purple"]')
    cursorText = await getEditingText()
    style = extractStyleProperty(cursorText!)
    expect(style?.color).toBe(rgbaToHex(colors.light.purple))
    expect(style?.backgroundColor).toBe(null)
  })

  it('Clear the text color when setting background color', async () => {
    const importText = `
      - Labrador
      - Golden Retriever`

    await paste(importText)

    await clickThought('Golden Retriever')
    let cursorText = await getEditingText()
    expect(extractStyleProperty(cursorText!)?.color).toBe(null)

    await click('[data-testid="toolbar-icon"][aria-label="Text Color"]')
    await click('[aria-label="text color swatches"] [aria-label="green"]')
    cursorText = await getEditingText()
    expect(extractStyleProperty(cursorText!)?.color).toBe(rgbaToHex(colors.light.green))

    await click('[aria-label="background color swatches"] [aria-label="purple"]')
    cursorText = await getEditingText()
    const style = extractStyleProperty(cursorText!)
    expect(style?.backgroundColor && rgbToHex(style?.backgroundColor)).toBe(rgbaToHex(colors.light.purple))
    expect(style?.color).toBe(rgbaToHex(colors.light.black))
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

  it('Empty <font> element will be removed after setting color to default.', async () => {
    const importText = `
    - Labrador
    - Golden Retriever`

    await paste(importText)

    await clickThought('Golden Retriever')

    await click('[data-testid="toolbar-icon"][aria-label="Text Color"]')
    await click('[aria-label="background color swatches"] [aria-label="blue"]')

    await click('[aria-label="text color swatches"] [aria-label="default"]')
    const result = await getEditingText()
    expect(result).toBe('Golden Retriever')
  })

  it('Empty <span> element will be removed after setting color to default.', async () => {
    const importText = `
    - Labrador
    - Golden Retriever`

    await paste(importText)

    await clickThought('Golden Retriever')

    await click('[data-testid="toolbar-icon"][aria-label="Text Color"]')
    await click('[aria-label="text color swatches"] [aria-label="blue"]')

    await click('[aria-label="text color swatches"] [aria-label="default"]')

    const result = await getEditingText()
    expect(result).toBe('Golden Retriever')
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
    await click('[data-testid="toolbar-icon"][aria-label="Context View"]')

    // ArrowDown to first context 'b'
    // TODO: Why does clickThought('b') not work here?
    await press('ArrowDown')
    const supColor3 = await getSuperscriptColor()
    expect(supColor3).toBeTruthy()
    expect(rgbToHex(supColor3!)).toBe(rgbaToHex(colors.light.green)) // Superscript should match the green color in context view
  })
})
