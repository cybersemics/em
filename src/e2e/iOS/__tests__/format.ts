/**
 * IOS Safari text formatting tests.
 * Uses WDIO test runner with Mocha framework.
 */
import hideKeyboardByTappingDone from '../helpers/hideKeyboardByTappingDone'
import newThought from '../helpers/newThought'
import tap from '../helpers/tap.js'

describe('Format', () => {
  it('applying bold to an unfocused cursor thought does not open the keyboard', async () => {
    // 1. Create a new thought 'Thought One'.
    await newThought('Thought One')

    // 2. Make it the cursor thought but not focused: dismiss the keyboard, which blurs the
    // editable (isKeyboardOpen → false) while leaving the cursor set on the thought.
    await hideKeyboardByTappingDone()

    // 3. Measure the scroll position of the viewport before formatting.
    const scrollBefore = await browser.execute(() => window.scrollY)

    // 4. Apply bold by tapping the Bold toolbar icon.
    const boldButton = await browser.$('[data-testid="toolbar-icon"][aria-label="Bold"]').getElement()
    await tap(boldButton, { y: 60 })

    // 5. Measure the scroll position again and ensure it did not change (#3999).
    const scrollAfter = await browser.execute(() => window.scrollY)
    expect(scrollAfter).toBe(scrollBefore)
  })
})
