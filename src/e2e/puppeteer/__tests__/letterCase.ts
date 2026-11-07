import click from '../helpers/click'
import clickThought from '../helpers/clickThought'
import clickToolbar from '../helpers/clickToolbar'
import getEditingText from '../helpers/getEditingText'
import getSelection from '../helpers/getSelection'
import keyboard from '../helpers/keyboard'
import newThought from '../helpers/newThought'
import paste from '../helpers/paste'
import setSelection from '../helpers/setSelection'
import waitForEditable from '../helpers/waitForEditable'
import waitForEditingTextChange from '../helpers/waitForEditingTextChange'
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
  await clickToolbar('Text Color', 'background color swatches', 'blue')

  // Apply Sentence Case
  await clickToolbar('Letter Case', 'SentenceCase')

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

  await clickToolbar('Letter Case', 'LowerCase')

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

  await clickToolbar('Letter Case', 'UpperCase')

  await waitForEditable('STRASSE x')

  // see the comment on the re-selection wait above
  await waitUntil(() => window.getSelection()?.toString() === 'STRASSE')

  expect(await getSelection().toString()).toBe('STRASSE')
})

// https://github.com/cybersemics/em/issues/4774
// These commands are covered in component tests as well, but it feels valuable to have some level
// of belt-and-suspenders coverage for timing issues related to edits. Copilot has dutifully warned
// that this test is a flake candidate, and additionally violates the principle of covering each
// behaviour at exactly one level.
it('flushes pending edits before applying letter case from the picker', async () => {
  await paste('a')

  await clickThought('a')
  await clickToolbar('Letter Case')
  await keyboard.type('b')

  // dropdown is already open, so directly click the UpperCase swatch rather than using the two-click clickToolbar
  await click('[aria-label="letter case swatches"] [aria-label="UpperCase"]')

  await waitForEditable('AB')

  expect(await getEditingText()).toBe('AB')
})

// https://github.com/cybersemics/em/issues/4281
it('applies letter case to the selected text only', async () => {
  await paste('Welcome to the world of beautiful people')

  await clickThought('Welcome to the world of beautiful people')
  await setSelection(24, 33)

  await clickToolbar('Letter Case', 'UpperCase')

  await waitForEditingTextChange('Welcome to the world of beautiful people')

  expect(await getEditingText()).toBe('Welcome to the world of BEAUTIFUL people')
})

// https://github.com/cybersemics/em/issues/5641
it('letter-cases the selected text in place without replacing it', async () => {
  await paste('Welcome to the world of beautiful people')

  await clickThought('Welcome to the world of beautiful people')
  await setSelection(24, 33)

  // Android dismisses its native selection menu (Cut, Copy, Paste) as soon as the text under the selection is replaced,
  // and re-selecting it does not bring the menu back. A range taken from the selection before the edit is live, so it
  // still spans the cased word only if the edit changed the selected text in place.
  const selectedRange = await page.evaluateHandle(() => window.getSelection()!.getRangeAt(0).cloneRange())

  await clickToolbar('Letter Case', 'UpperCase')

  await waitForEditable('Welcome to the world of BEAUTIFUL people')

  expect(await selectedRange.evaluate(range => range.toString())).toBe('BEAUTIFUL')
})

// https://github.com/cybersemics/em/issues/5641
it.skip('letter-cases selected text in place after applying Bold', async () => {
  await paste('Welcome to the world of beautiful people')

  await clickThought('Welcome to the world of beautiful people')
  await setSelection(24, 33)
  await clickToolbar('Bold')
  await waitForEditable('Welcome to the world of <b>beautiful</b> people')

  // Keep the live range from before casing: restoring a replacement range leaves Android's native menu dismissed.
  const selectedRange = await page.evaluateHandle(() => window.getSelection()!.getRangeAt(0).cloneRange())

  await clickToolbar('Letter Case', 'UpperCase')
  await waitForEditable('Welcome to the world of <b>BEAUTIFUL</b> people')

  expect(await selectedRange.evaluate(range => range.toString())).toBe('BEAUTIFUL')
  expect(await getSelection().toString()).toBe('BEAUTIFUL')
})

it('the selected text remains selected when the thought has trailing whitespace', async () => {
  // Typed rather than pasted: Editable trims the value on its way into Redux while the live editable keeps the
  // trailing space, so the text the editable re-renders to is not the text the DOM had before the edit.
  await newThought('hello beautiful world')
  await keyboard.type(' ')

  // Typing hides the toolbar in distraction-free mode. Clicking the thought is a pointer event, which reveals it.
  await clickThought('hello beautiful world ')
  await setSelection(6, 15)

  await clickToolbar('Letter Case', 'UpperCase')

  // waitForEditable polls on an animation frame, and the re-selection runs in the mutation observer callback for the
  // same re-render, so the selection is already restored by the time the new value is visible.
  await waitForEditable('hello BEAUTIFUL world')

  expect(await getSelection().toString()).toBe('BEAUTIFUL')
})
