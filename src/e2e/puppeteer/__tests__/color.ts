import helpers from '../helpers'

vi.setConfig({ testTimeout: 60000, hookTimeout: 60000 })

const { getEditingText, click, clickThought, paste, waitForEditable } = helpers()

/**
 * Extract the Style of html string.
 */
const extractStyleProperty = (html: string, property: string): string | null => {
  // Create a regex pattern that ensures the property is not part of another property
  const regex = new RegExp(`"${property}\\s*:\\s*([^;]+)`, 'i')
  const match = regex.exec(html)
  return match ? match[1].trim() : null
}

it('Set the text color of the text', async () => {
  const importText = `
    - Labrador
    - Golden Retriever`

  await paste(importText)

  await waitForEditable('Golden Retriever')
  await clickThought('Golden Retriever')

  await click('.toolbar-icon[aria-label="Text Color"]')
  await click('[aria-label="text color swatches"] [aria-label="blue"]')

  const cursorText = await getEditingText()
  const result = extractStyleProperty(cursorText!, 'color')
  expect(result).toBe('#00c7e6')
  // expect(result?.backColor).toBe(null)
})

it('Set the background color of the text', async () => {
  const importText = `
    - Labrador
    - Golden Retriever`

  await paste(importText)

  await waitForEditable('Golden Retriever')
  await clickThought('Golden Retriever')
  await click('.toolbar-icon[aria-label="Text Color"]')
  await click('[aria-label="background color swatches"] [aria-label="green"]')

  const cursorText = await getEditingText()
  const result = extractStyleProperty(cursorText!, 'background-color')
  expect(result).toBe('rgb(0, 214, 136)')
})

it('Clear the text color when selecting white', async () => {
  const importText = `
    - Labrador
    - Golden Retriever`

  await paste(importText)

  await waitForEditable('Golden Retriever')
  await clickThought('Golden Retriever')
  let cursorText = await getEditingText()
  expect(extractStyleProperty(cursorText!, 'color')).toBe(null)

  await click('.toolbar-icon[aria-label="Text Color"]')
  await click('[aria-label="text color swatches"] [aria-label="green"]')
  cursorText = await getEditingText()
  expect(extractStyleProperty(cursorText!, 'color')).toBe('#00d688')

  await click('[aria-label="text color swatches"] [aria-label="default"]')
  cursorText = await getEditingText()
  expect(extractStyleProperty(cursorText!, 'color')).toBe(null)
})

it('Clear the background color when selecting text color', async () => {
  const importText = `
    - Labrador
    - Golden Retriever`

  await paste(importText)

  await waitForEditable('Golden Retriever')
  await clickThought('Golden Retriever')
  let cursorText = await getEditingText()
  expect(extractStyleProperty(cursorText!, 'background-color')).toBe(null)

  await click('.toolbar-icon[aria-label="Text Color"]')
  await click('[aria-label="background color swatches"] [aria-label="green"]')
  cursorText = await getEditingText()
  expect(extractStyleProperty(cursorText!, 'background-color')).toBe('rgb(0, 214, 136)')

  await click('[aria-label="text color swatches"] [aria-label="purple"]')
  cursorText = await getEditingText()
  expect(extractStyleProperty(cursorText!, 'color')).toBe('#aa80ff')
  expect(extractStyleProperty(cursorText!, 'background-color')).toBe(null)
})

it('Clear the text color when setting background color', async () => {
  const importText = `
    - Labrador
    - Golden Retriever`

  await paste(importText)

  await waitForEditable('Golden Retriever')
  await clickThought('Golden Retriever')
  let cursorText = await getEditingText()
  expect(extractStyleProperty(cursorText!, 'color')).toBe(null)

  await click('.toolbar-icon[aria-label="Text Color"]')
  await click('[aria-label="text color swatches"] [aria-label="green"]')
  cursorText = await getEditingText()
  expect(extractStyleProperty(cursorText!, 'color')).toBe('#00d688')

  await click('[aria-label="background color swatches"] [aria-label="purple"]')
  cursorText = await getEditingText()
  expect(extractStyleProperty(cursorText!, 'background-color')).toBe('rgb(170, 128, 255)')
  expect(extractStyleProperty(cursorText!, 'color')).toBe(null)
})
