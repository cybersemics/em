/**
 * IOS Safari text formatting tests.
 * Uses WDIO test runner with Mocha framework.
 */
import clickThought from '../helpers/clickThought'
import gesture from '../helpers/gesture'
import getClearedPlaceholderStyle from '../helpers/getClearedPlaceholderStyle'
import getEditingText from '../helpers/getEditingText'
import hideKeyboardByTappingDone from '../helpers/hideKeyboardByTappingDone'
import newThought from '../helpers/newThought'
import paste from '../helpers/paste'
import tapToolbar from '../helpers/tapToolbar.js'
import waitForElement from '../helpers/waitForElement'

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
    await tapToolbar('Bold')

    // 5. Assert that bold was actually applied. Without this the test passes even when the tap misses the button
    // entirely, since a tap that hits nothing trivially satisfies the scroll assertion below.
    expect(await getEditingText()).toBe('<b>Thought One</b>')

    // 6. Measure the scroll position again and ensure it did not change (#3999).
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
    await tapToolbar('Text Color', 'background color swatches', 'blue')

    /** Native undo closes the keyboard, so the editable will lose focus.
     * Reads the innerHTML of the (single) thought, independent of edit/keyboard state. */
    const thoughtHtml = () => browser.execute(() => document.querySelector('[data-editable]')?.innerHTML)

    // Trigger native undo the way iOS shake-to-undo / three-finger swipe does. In real WebKit, document.execCommand('undo')
    // fires the same cancelable historyUndo beforeinput event as the native gesture. em's beforeinput handler blocks the
    // native DOM undo (preventDefault) and routes it through em's single-step undo, which re-renders the editable (#3954).
    await browser.execute(() => document.execCommand('undo'))

    expect(await thoughtHtml()).toBe('One')
  })

  // https://github.com/cybersemics/em/issues/5107
  it('applies a text color again after it was undone with the keyboard down', async () => {
    // Use a pre-existing thought so the format edit is its own undo step (not coalesced with newThought).
    await paste(`
    - One`)
    await clickThought('One') // set the cursor on the thought

    // Apply a green font color via the toolbar.
    await tapToolbar('Text Color', 'text color swatches', 'green')

    /** Reads the innerHTML of the (single) thought, independent of edit/keyboard state. */
    const thoughtHtml = () => browser.execute(() => document.querySelector('[data-editable]')?.innerHTML)

    // Precondition: the color was applied, otherwise the undo below would have nothing to revert.
    expect(await thoughtHtml()).toBe('<font color="#00d688">One</font>')

    // Tap the Text Color button again to close the picker.
    await tapToolbar('Text Color')

    // Dismiss the keyboard, which blurs the editable while leaving the cursor set. This is the state the device is in
    // when the shake-to-undo dialog takes focus, and the state in which no selectionchange follows the undo.
    await hideKeyboardByTappingDone()

    await tapToolbar('Undo')
    await browser.waitUntil(async () => (await thoughtHtml()) === 'One', {
      timeoutMsg: 'undo did not remove the green font color',
    })

    // Re-open the picker and tap the same green swatch. The swatch is no longer selected, so this applies the color
    // rather than toggling it back off.
    await tapToolbar('Text Color', 'text color swatches', 'green')

    expect(await thoughtHtml()).toBe('<font color="#00d688">One</font>')
  })

  // https://github.com/cybersemics/em/issues/4716
  it('Clear Thought slants the emoji in the placeholder', async () => {
    // paste sets the cursor to the last imported thought, which is all clearThought needs.
    await paste(`
    - 😁 Hello`)

    await gesture('rl') // Clear Thought
    await waitForElement('[data-editable][data-placeholder-cleared]')

    const placeholder = await getClearedPlaceholderStyle()

    expect(placeholder.content).toContain('😁 Hello')

    // WebKit never synthesizes oblique for a color emoji glyph, so a slant that reaches the emoji has to come from a
    // transform on the rendered box rather than from font-style. Read the angle back out of the computed matrix
    // (matrix(a, b, c, d, e, f), where c is the tangent of the skew angle).
    const values = placeholder.transform
      .match(/matrix\(([^)]+)\)/)?.[1]
      .split(',')
      .map(Number)
    if (!values && placeholder.transform !== 'none')
      throw new Error(`expected a matrix or no transform on the cleared placeholder, got "${placeholder.transform}"`)
    const skewXDeg = values ? (Math.atan(-values[2]) * 180) / Math.PI : 0
    expect(skewXDeg).toBeCloseTo(12, 1)

    // The transform slants the whole placeholder, so font-style must not slant the text a second time.
    expect(placeholder.fontStyle).toBe('normal')
  })

  it('Clear Thought italicizes a placeholder that has no emoji', async () => {
    // paste sets the cursor to the last imported thought, which is all clearThought needs.
    await paste(`
    - Hello`)

    await gesture('rl') // Clear Thought
    await waitForElement('[data-editable][data-placeholder-cleared]')

    const placeholder = await getClearedPlaceholderStyle()

    expect(placeholder.content).toContain('Hello')

    // A skew slopes the upright letterforms rather than selecting the font's italic face, so it is reserved for the
    // emoji that font-style cannot slant. A thought without one keeps true italics.
    expect(placeholder.transform).toBe('none')
    expect(placeholder.fontStyle).toBe('italic')
  })
})
