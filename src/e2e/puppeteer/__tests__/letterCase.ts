import click from '../helpers/click'
import clickThought from '../helpers/clickThought'
import paste from '../helpers/paste'
import { page } from '../setup'

vi.setConfig({ testTimeout: 20000, hookTimeout: 60000 })

/** Gets the computed border-color of a letter case swatch button by its aria-label. */
const getSwatchBorderColor = (label: string) =>
  page.evaluate(l => {
    const el = document.querySelector(`[aria-label="letter case swatches"] [aria-label="${l}"]`)
    return el ? window.getComputedStyle(el).borderColor : null
  }, label)

it('Sentence Case button is marked as active after applying Sentence Case to a thought with background color', async () => {
  await paste('hello world. second sentence.')

  await clickThought('hello world. second sentence.')

  // Apply a background highlight color
  await click('[data-testid="toolbar-icon"][aria-label="Text Color"]')
  await click('[aria-label="background color swatches"] [aria-label="blue"]')

  // Open the Letter Case picker
  await click('[data-testid="toolbar-icon"][aria-label="Letter Case"]')

  // Click Sentence Case
  await click('[aria-label="letter case swatches"] [aria-label="SentenceCase"]')

  // The picker stays open after clicking a swatch; check the active state of each button.
  // An active button has a solid foreground border; an inactive button has a transparent border.
  const sentenceCaseBorderColor = await getSwatchBorderColor('SentenceCase')
  const lowerCaseBorderColor = await getSwatchBorderColor('LowerCase')

  // SentenceCase should be active (non-transparent border)
  expect(sentenceCaseBorderColor).not.toBe('rgba(0, 0, 0, 0)')
  // LowerCase should not be active (transparent border)
  expect(lowerCaseBorderColor).toBe('rgba(0, 0, 0, 0)')
})
