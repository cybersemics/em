import clickThought from '../helpers/clickThought'
import dispatchPaste from '../helpers/dispatchPaste'
import gesture from '../helpers/gesture'
import newThought from '../helpers/newThought'
import paste from '../helpers/paste'
import recordClipboardWrites from '../helpers/recordClipboardWrites'
import tap from '../helpers/tap'
import tapToolbar, { toolbarTapOptions } from '../helpers/tapToolbar'
import waitForCommandCenterOpen from '../helpers/waitForCommandCenterOpen'
import waitForEditableCount from '../helpers/waitForEditableCount'
import waitForElement from '../helpers/waitForElement'
import waitForMulticursor from '../helpers/waitForMulticursor'

/** Swipe parameters the gestures spec uses on BrowserStack, where the default cadence is too quick to register. */
const swipe = { segmentLength: 90, waitMs: 600 }

describe('Copy', () => {
  // https://github.com/cybersemics/em/issues/3960
  it('preserves underline, strikethrough, text color, and background highlight through a copy and paste', async () => {
    await paste(`
      - One
      - Two
      - Three
      - Four
    `)

    await clickThought('One')
    await tapToolbar('Underline')

    await clickThought('Two')
    await tapToolbar('Strikethrough')

    await clickThought('Three')
    await tapToolbar('Text Color', 'text color swatches', 'purple')

    // The picker stays open, so tap the background swatch directly; tapToolbar would toggle it closed.
    await clickThought('Four')
    await tap(
      await waitForElement(
        '[data-testid="toolbar-icon"][aria-label="Text Color"] [aria-label="background color swatches"] [aria-label="blue"]',
      ),
      toolbarTapOptions,
    )

    const clipboardWrites = await recordClipboardWrites()

    // Close the picker, whose popover would otherwise sit over the swipes below.
    await tapToolbar('Text Color')

    // Select All (←↓→), then swipe up for the Command Center and tap Copy
    await gesture('ldr', swipe)
    await waitForMulticursor(4)
    await gesture('u', swipe)
    await waitForCommandCenterOpen()
    await tap(await waitForElement('[aria-label="Copy"]'), toolbarTapOptions)

    const writes = await clipboardWrites()

    expect(writes).toHaveLength(1)
    expect(writes[0].accepted).toBe(true)
    expect(writes[0].contents['text/html']).toContain('<u>One</u>')
    expect(writes[0].contents['text/html']).toContain('<strike>Two</strike>')
    expect(writes[0].contents['text/html']).toContain('color="#aa80ff"')
    expect(writes[0].contents['text/html']).toContain('background-color: rgb(0, 199, 230)')

    // Paste into a new subthought, which is where the issue's steps end. A sibling would be merged by #3622.
    await newThought(undefined, { insertNewSubthought: true })
    await dispatchPaste(writes[0].contents)

    // Each format should survive the round trip. Import normalizes a <font color> into an equivalent span,
    // so the pasted copies of Three and Four carry the style form rather than the attribute form.
    await waitForEditableCount('<u>One</u>', 2)
    await waitForEditableCount('<strike>Two</strike>', 2)
    await waitForEditableCount('<span style="color: #aa80ff;">Three</span>', 1)
    await waitForEditableCount('<span style="color: #000000;background-color: rgb(0, 199, 230);">Four</span>', 1)
  })
})
