import click from '../helpers/click'
import clickThought from '../helpers/clickThought'
import getSelection from '../helpers/getSelection'
import paste from '../helpers/paste'
import scrollIntoView from '../helpers/scrollIntoView'
import setSelection from '../helpers/setSelection'
import waitForEditable from '../helpers/waitForEditable'
import waitUntil from '../helpers/waitUntil'
import { page } from '../session'

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

// https://github.com/cybersemics/em/issues/4840
it('the selected text remains selected after applying Lower Case', async () => {
  await paste('AAA')

  await clickThought('AAA')
  await setSelection(0, 3)

  await scrollIntoView('[data-testid="toolbar-icon"][aria-label="Letter Case"]', { inline: 'center' })
  await click('[data-testid="toolbar-icon"][aria-label="Letter Case"]')
  await click('[aria-label="letter case swatches"] [aria-label="LowerCase"]')

  await waitForEditable('aaa')

  // formatLetterCase re-selects the text on the animation frame after the edit re-renders the editable, so the
  // editable can already show the new value while the caret is still collapsed. Wait for the re-selection,
  // otherwise the test intermittently fails in CI.
  await waitUntil(() => window.getSelection()?.toString() === 'aaa')

  expect(await getSelection().toString()).toBe('aaa')
})

// https://github.com/cybersemics/em/pull/4858#pullrequestreview-4893666301
it('the selected text remains selected after a letter case change that lengthens it', async () => {
  await paste('Straße x')

  await clickThought('Straße x')
  await setSelection(0, 6)

  await scrollIntoView('[data-testid="toolbar-icon"][aria-label="Letter Case"]', { inline: 'center' })
  await click('[data-testid="toolbar-icon"][aria-label="Letter Case"]')
  await click('[aria-label="letter case swatches"] [aria-label="UpperCase"]')

  await waitForEditable('STRASSE X')

  // see the comment on the re-selection wait above
  await waitUntil(() => window.getSelection()?.toString() === 'STRASSE')

  expect(await getSelection().toString()).toBe('STRASSE')
})
