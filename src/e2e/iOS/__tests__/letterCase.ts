/**
 * IOS Safari letter case tests.
 * Uses WDIO test runner with Mocha framework.
 */
import clickThought from '../helpers/clickThought'
import paste from '../helpers/paste'
import setSelection from '../helpers/setSelection'
import showEditMenu from '../helpers/showEditMenu'
import tapToolbar from '../helpers/tapToolbar.js'
import waitForElement from '../helpers/waitForElement'

describe('Letter Case', () => {
  // https://github.com/cybersemics/em/issues/5641
  it('shows a selection menu after applying letter case to the selected text', async () => {
    await paste(`
    - Welcome to the world of beautiful people`)
    await clickThought('Welcome to the world of beautiful people')

    const selected = await setSelection(24, 33)
    expect(selected.text).toBe('beautiful')
    await showEditMenu()

    await tapToolbar('Letter Case', 'UpperCase')

    // Upper Case moves the selected text, which dismisses Safari's native edit menu, so em shows its own in its place.
    await waitForElement('[aria-label="selection menu"]')

    expect(await browser.execute(() => window.getSelection()?.toString())).toBe('BEAUTIFUL')
  })
})
