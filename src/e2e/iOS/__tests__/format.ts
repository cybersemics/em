/**
 * IOS Safari text formatting tests.
 * Uses WDIO test runner with Mocha framework.
 */
import { WindowEm } from '../../../initialize.js'
import hideKeyboardByTappingDone from '../helpers/hideKeyboardByTappingDone'
import newThought from '../helpers/newThought'

describe('Format', () => {
  it('applying bold to an unfocused cursor thought does not open the keyboard', async () => {
    // 1. Create a new thought 'Thought One'.
    await newThought('Thought One')

    // 2. Make it the cursor thought but not focused: dismiss the keyboard, which blurs the
    // editable (isKeyboardOpen → false) while leaving the cursor set on the thought.
    await hideKeyboardByTappingDone()

    // 3. Measure the scroll position of the viewport before formatting.
    const scrollBefore = await browser.execute(() => window.scrollY)

    // 4. Apply bold. Dispatch the Bold command the same way the toolbar button does; the
    // toolbar button relies on touch/pointer gestures that a WebDriver element click cannot
    // reliably trigger on iOS Safari, whereas the keyboard/scroll behavior under test lives in
    // the formatSelection action itself.
    await browser.execute(() => {
      const em = window.em as WindowEm
      em.testHelpers.executeCommandById('bold')
    })

    // Allow any focus-induced scroll to settle before measuring.
    await browser.pause(1000)

    // 5. Measure the scroll position again and ensure it did not change (#3999).
    const scrollAfter = await browser.execute(() => window.scrollY)
    expect(scrollAfter).toBe(scrollBefore)
  })
})
