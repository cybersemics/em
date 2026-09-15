/**
 * IOS Safari undo tests.
 * Uses WDIO test runner with Mocha framework.
 */
import nativeUndo from '../helpers/nativeUndo'
import newThought from '../helpers/newThought'
import setSelection from '../helpers/setSelection'
import waitForEditable from '../helpers/waitForEditable'
import waitForElement from '../helpers/waitForElement'

describe('Undo', () => {
  // https://github.com/cybersemics/em/issues/4984
  it('native undo deletes the thought after the edits made on top of it have been undone', async () => {
    await newThought('Makre')

    // Replace "kre" with "ke" as the iOS keyboard does when it autocorrects a word. Auto-Correction is off on shared
    // BrowserStack devices, so the replacement is typed over a selection, which WebKit records as the single native
    // undo step the autocorrection would.
    await setSelection(2, 5)
    await browser.keys('k')
    await browser.keys('e')
    await waitForEditable('Make')

    await newThought()

    // Undo the new thought.
    await nativeUndo()
    await browser.waitUntil(() => browser.execute(() => document.querySelectorAll('[data-editable]').length === 1), {
      timeout: 15000,
      timeoutMsg: 'the first native undo did not remove the new thought',
    })

    // Undo the autocorrection.
    await nativeUndo()
    await waitForEditable('Makre')

    // Undo the thought itself. WebKit dispatches the gesture's beforeinput only while its own undo stack has a step to
    // undo, and it registers a step only for the edits it performed itself, so the gesture stops reaching em while em
    // still has thoughts to undo.
    await nativeUndo()
    try {
      await waitForElement('[aria-label="empty-thoughtspace"]', { timeout: 15000 })
    } catch {
      const values = await browser.execute(() =>
        Array.from(document.querySelectorAll('[data-editable]')).map(element => element.innerHTML),
      )
      throw new Error(`The third native undo did not delete the thought. Thoughts: ${JSON.stringify(values)}`)
    }
  })
})
