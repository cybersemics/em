import clickThought from '../helpers/clickThought'
import gesture from '../helpers/gesture'
import paste from '../helpers/paste'
import recordClipboardWrites from '../helpers/recordClipboardWrites'
import tap from '../helpers/tap'
import tapToolbar, { toolbarTapOptions } from '../helpers/tapToolbar'
import waitForCommandCenterOpen from '../helpers/waitForCommandCenterOpen'
import waitForElement from '../helpers/waitForElement'

describe('Copy', () => {
  // https://github.com/cybersemics/em/issues/3960
  it('carries underline, strikethrough, text color, and background highlight onto the clipboard', async () => {
    await paste(`
      - a
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

    // Close the picker, whose popover would otherwise sit over the swipe that opens the Command Center.
    await tapToolbar('Text Color')

    // Copy Cursor copies the cursor and all of its descendants, so all four formats ride on one copy.
    await clickThought('a')

    // swipe up to open the Command Center, then tap its Copy button
    await gesture('u', { segmentLength: 90, waitMs: 600 })
    await waitForCommandCenterOpen()
    await tap(await waitForElement('[aria-label="Copy"]'), toolbarTapOptions)

    const writes = await clipboardWrites()

    expect(writes).toHaveLength(1)
    expect(writes[0].accepted).toBe(true)
    expect(writes[0].contents['text/html']).toContain('<u>One</u>')
    expect(writes[0].contents['text/html']).toContain('<strike>Two</strike>')
    expect(writes[0].contents['text/html']).toContain('color="#aa80ff"')
    expect(writes[0].contents['text/html']).toContain('background-color: rgb(0, 199, 230)')
  })
})
