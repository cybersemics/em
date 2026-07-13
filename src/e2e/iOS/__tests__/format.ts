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

  // Regression test for https://github.com/cybersemics/em/issues/3954.
  // Native undo (iOS shake-to-undo / three-finger swipe) fires a *cancelable* `beforeinput` with inputType
  // historyUndo (verified on-device). Left unhandled it mutates the contenteditable DOM directly, bypassing em's undo
  // and desyncing the DOM from Redux — for a background highlight this reverts only the last execCommand step, leaving
  // a black font color with no background that renders the thought invisible (black-on-black on the default dark
  // theme). em's beforeinput handler must preventDefault this and route it through em's undo, which reverts to the
  // correct Redux state and re-renders the editable.
  //
  // This exercises the real iOS path that the puppeteer suite cannot: preventing the cancelable `beforeinput`
  // suppresses the follow-up `input`, so Chromium's execCommand('undo') (input-only, non-cancelable) never reaches it.
  it('undoing a background highlight via native undo restores visible text (#3954)', async () => {
    // Use a pre-existing thought so the format edit is its own undo step (not coalesced with newThought).
    await paste(`
    - One`)
    await waitForEditable('One')
    await clickThought('One') // set the cursor on the thought

    // Apply a blue background highlight via the toolbar.
    const textColor = await browser.$('[data-testid="toolbar-icon"][aria-label="Text Color"]').getElement()
    await tap(textColor, { y: 60 })
    const blueBg = await browser.$('[aria-label="background color swatches"] [aria-label="blue"]').getElement()
    await blueBg.waitForDisplayed({ timeout: 5000 })
    await tap(blueBg, { y: 60 })

    /** Reads the innerHTML of the (single) thought, independent of edit/keyboard state. */
    const thoughtHtml = () => browser.execute(() => document.querySelector('[data-editable]')?.innerHTML)

    // sanity: the background highlight was applied
    await waitUntil(async () => /background-color/.test((await thoughtHtml()) ?? ''))

    // Dispatch the exact cancelable beforeinput that iOS native undo produces, in the real WebKit engine.
    await browser.execute(() => {
      const target = document.querySelector('[data-editable]') ?? document.body
      target.dispatchEvent(new InputEvent('beforeinput', { inputType: 'historyUndo', cancelable: true, bubbles: true }))
    })

    // after native undo the thought returns to plain, visible text with no leftover color/background markup
    await waitUntil(async () => (await thoughtHtml()) === 'One')
    expect(await thoughtHtml()).toBe('One')
  })
})
