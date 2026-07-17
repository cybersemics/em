/**
 * IOS Safari text formatting tests.
 * Uses WDIO test runner with Mocha framework.
 */
import clickThought from '../helpers/clickThought'
import hideKeyboardByTappingDone from '../helpers/hideKeyboardByTappingDone'
import newThought from '../helpers/newThought'
import paste from '../helpers/paste'
import tap from '../helpers/tap.js'
import waitForEditable from '../helpers/waitForEditable'
import waitUntil from '../helpers/waitUntil'

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

  // Regression test for https://github.com/cybersemics/em/issues/3954, retained for the DOMParser refactor (#4637).
  // Native undo (iOS shake-to-undo / three-finger swipe) fires a *cancelable* `beforeinput` with inputType historyUndo
  // (verified on-device). Left unhandled it mutates the contenteditable DOM directly, bypassing em's undo and desyncing
  // the DOM from Redux — for a background highlight this leaves a black font color with no background that renders the
  // thought invisible (black-on-black on the default dark theme). em's beforeinput handler must preventDefault this and
  // route it through em's undo, which reverts to the correct Redux state and re-renders the editable.
  //
  // With the DOMParser refactor, formatSelection registers exactly one native undo step per format (#4637) and the
  // ColorPicker applies a swatch in a single dispatch, so one native undo gesture maps to one em undo (no dedupe).
  it('undoing a background highlight via native undo restores visible text (#3954)', async () => {
    // Use a pre-existing thought so the format edit is its own undo step (not coalesced with newThought).
    await paste(`
    - One`)
    await waitForEditable('One')
    await clickThought('One') // set the cursor on the thought

    // Apply a blue background highlight via the toolbar.
    const textColor = await browser.$('[data-testid="toolbar-icon"][aria-label="Text Color"]').getElement()
    await tap(textColor, { y: 60, pointerType: 'touch' })
    const blueBg = await browser.$('[aria-label="background color swatches"] [aria-label="blue"]').getElement()
    await blueBg.waitForDisplayed({ timeout: 5000 })
    await tap(blueBg, { y: 60, pointerType: 'touch' })

    /** Reads the innerHTML of the (single) thought, independent of edit/keyboard state. */
    const thoughtHtml = () => browser.execute(() => document.querySelector('[data-editable]')?.innerHTML)

    // sanity: the background highlight was applied
    await waitUntil(async () => /background-color/.test((await thoughtHtml()) ?? ''))

    // Trigger native undo the way iOS shake-to-undo / three-finger swipe does. In real WebKit, document.execCommand('undo')
    // fires the same cancelable historyUndo beforeinput event as the native gesture. em's beforeinput handler blocks the
    // native DOM undo (preventDefault) and routes it through em's single-step undo, which re-renders the editable (#3954).
    await browser.execute(() => {
      const editable = document.querySelector('[data-editable]') as HTMLElement | null
      editable?.focus()
      document.execCommand('undo')
    })

    // em undo re-renders asynchronously; the thought returns to plain, visible text with no leftover color/background.
    // A double undo would also revert the paste and remove the thought, so asserting "One" verifies both the fix and
    // that exactly one em undo fired.
    await waitUntil(async () => (await thoughtHtml()) === 'One')
    expect(await thoughtHtml()).toBe('One')
  })
})
