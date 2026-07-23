/**
 * IOS Safari auto-correct tests.
 * Uses WDIO test runner with Mocha framework.
 */
import { HOME_TOKEN } from '../../../constants.js'
import { WindowEm } from '../../../initialize.js'
import newThought from '../helpers/newThought'

describe('autocorrect', () => {
  // https://github.com/cybersemics/em/issues/4476
  it('an auto-corrected word is committed to state so it can be undone after moving to another thought', async () => {
    // Create a thought and type a misspelled word that iOS predictive text would auto-correct.
    await newThought('makre')

    // Simulate iOS auto-correct: WebKit fires an insertReplacementText input event to replace the
    // word, immediately followed by insertText(' ') when Space is tapped to accept the suggestion.
    await browser.execute(() => {
      const editable = document.querySelector('[data-editing=true] [data-editable]') as HTMLElement | null
      if (!editable) throw new Error('editable not found')
      editable.textContent = 'makes'
      editable.dispatchEvent(
        new InputEvent('input', { bubbles: true, inputType: 'insertReplacementText', data: 'makes' }),
      )
      editable.textContent = 'makes '
      editable.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: ' ' }))
    })

    // Move the cursor to another thought (issue Step 5).
    await newThought('other')

    // The auto-corrected value must be persisted to state (not the pre-correction "makre"), otherwise
    // undo has nothing to revert and appears to do nothing.
    const exported = await browser.execute(
      (rootToken: string) => (window.em as WindowEm).exportContext([rootToken], 'text/plain'),
      HOME_TOKEN,
    )
    expect(exported).toContain('makes')
    expect(exported).not.toContain('makre')
  })
})
