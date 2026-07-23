/**
 * IOS Safari text formatting tests.
 * Uses WDIO test runner with Mocha framework.
 */
import clickThought from '../helpers/clickThought'
import hideKeyboardByTappingDone from '../helpers/hideKeyboardByTappingDone'
import newThought from '../helpers/newThought'
import paste from '../helpers/paste'
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

  // With the DOMParser refactor, formatSelection registers exactly one native undo step per format (#4637) and the
  // ColorPicker applies a swatch in a single dispatch, so one native undo gesture maps to one em undo (no dedupe).
  it('undoing a background highlight via native undo restores visible text (#3954)', async () => {
    // Use a pre-existing thought so the format edit is its own undo step (not coalesced with newThought).
    await paste(`
    - One`)
    await clickThought('One') // set the cursor on the thought

    // Apply a blue background highlight via the toolbar.
    const textColor = await browser.$('[data-testid="toolbar-icon"][aria-label="Text Color"]').getElement()
    await tap(textColor, { y: 60, pointerType: 'touch' })
    const blueBg = await browser.$('[aria-label="background color swatches"] [aria-label="blue"]').getElement()
    await tap(blueBg, { y: 60, pointerType: 'touch' })

    /** Native undo closes the keyboard, so the editable will lose focus.
     * Reads the innerHTML of the (single) thought, independent of edit/keyboard state. */
    const thoughtHtml = () => browser.execute(() => document.querySelector('[data-editable]')?.innerHTML)

    // Trigger native undo the way iOS shake-to-undo / three-finger swipe does. In real WebKit, document.execCommand('undo')
    // fires the same cancelable historyUndo beforeinput event as the native gesture. em's beforeinput handler blocks the
    // native DOM undo (preventDefault) and routes it through em's single-step undo, which re-renders the editable (#3954).
    await browser.execute(() => document.execCommand('undo'))

    expect(await thoughtHtml()).toBe('One')
  })
})
