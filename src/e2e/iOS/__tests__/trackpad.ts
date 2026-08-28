/**
 * IOS virtual-keyboard trackpad tests.
 *
 * These run on a current iOS rather than the pinned one the rest of the suite uses. The trackpad
 * (long press the space bar) only drags the caret out of its editing host on Safari 26 — on 18 the caret
 * clamps to the thought, which is the behaviour change that produced #3276 in the first place. Pinned to 17,
 * this test would pass without exercising anything. See wdio.browserstack.conf.ts.
 */
import clickThought from '../helpers/clickThought'
import getEditingText from '../helpers/getEditingText'
import getSelection from '../helpers/getSelection'
import isKeyboardShown from '../helpers/isKeyboardShown'
import newThought from '../helpers/newThought'
import paste from '../helpers/paste'
import scrubSpaceBar from '../helpers/scrubSpaceBar'
import tap from '../helpers/tap'
import waitForEditable from '../helpers/waitForEditable'
import waitUntil from '../helpers/waitUntil'

describe('Keyboard trackpad', () => {
  it('a caret scrubbed past the left edge stays in the cursor thought (#3276)', async () => {
    await newThought()
    await paste(
      [''],
      `
    - a
      - b
        - c
          - d
        - e`,
    )

    // the issue reports a smaller font makes it easier to trigger, the rows sitting closer together
    await browser.execute(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const em = (window as any).em
      em.store.dispatch({ type: 'fontSize', value: 16 })
    })

    // the cursor must be deep enough that moving it up collapses a subtree, which is what moves the thoughts
    // under the finger and lets the caret keep walking
    await clickThought('a')
    await clickThought('b')
    await clickThought('c')

    // y:60 compensates for the offset between web and screen coordinates
    const editable = await waitForEditable('d')
    await tap(editable, { y: 60 })
    await tap(editable, { y: 60 })
    await waitUntil(isKeyboardShown)

    await scrubSpaceBar(-6)

    // unfixed, the cursor walks to an ancestor, the selection is left nowhere, and the keyboard stays up over
    // a thought that can no longer be typed into
    expect(await getEditingText()).toBe('d')
    expect(await getSelection().focusNode?.textContent).toBe('d')
    expect(await isKeyboardShown()).toBeTruthy()
  })
})
