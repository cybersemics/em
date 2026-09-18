import clickThought from '../helpers/clickThought'
import gesture from '../helpers/gesture'
import paste from '../helpers/paste'
import recordClipboardWrites from '../helpers/recordClipboardWrites'
import tap from '../helpers/tap'
import { toolbarTapOptions } from '../helpers/tapToolbar'
import waitForCommandCenterOpen from '../helpers/waitForCommandCenterOpen'
import waitForElement from '../helpers/waitForElement'

describe('Copy', () => {
  // https://github.com/cybersemics/em/issues/3960
  it('carries underline, strikethrough, text color, and background highlight onto the clipboard', async () => {
    await paste(`
      - a
        - <u>One</u>
        - <strike>Two</strike>
        - <font color="#aa80ff">Three</font>
        - <font style="background-color: rgb(0, 199, 230);">Four</font>
    `)

    const clipboardWrites = await recordClipboardWrites()

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
    // import normalizes a <font color> into an equivalent span, so the copy carries the style form.
    expect(writes[0].contents['text/html']).toContain('color: #aa80ff')
    expect(writes[0].contents['text/html']).toContain('background-color: rgb(0, 199, 230)')
  })
})
