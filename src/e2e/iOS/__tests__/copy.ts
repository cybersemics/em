import clickThought from '../helpers/clickThought'
import gesture from '../helpers/gesture'
import paste from '../helpers/paste'
import pasteFromEditMenu from '../helpers/pasteFromEditMenu'
import tap from '../helpers/tap'
import tapToolbar, { toolbarTapOptions } from '../helpers/tapToolbar'
import waitForCommandCenterClosed from '../helpers/waitForCommandCenterClosed'
import waitForCommandCenterOpen from '../helpers/waitForCommandCenterOpen'
import waitForElement from '../helpers/waitForElement'

/** Counts the thoughts whose rendered html matches exactly. */
const editableCount = (html: string) =>
  browser.execute(
    (html: string) =>
      Array.from(document.querySelectorAll('[data-editable]')).filter(el => el.innerHTML === html).length,
    html,
  )

/**
 * Waits for exactly the given number of thoughts to render the given html. Reports what rendered instead on
 * timeout, since a paste that dropped its formatting renders the text without the markup and would otherwise
 * time out without saying what it produced.
 */
const waitForEditableCount = async (html: string, n: number): Promise<void> => {
  try {
    await browser.waitUntil(async () => (await editableCount(html)) === n, { timeout: 10000, interval: 250 })
  } catch {
    const rendered = await browser.execute(() =>
      Array.from(document.querySelectorAll('[data-editable]')).map(el => el.innerHTML),
    )
    throw new Error(
      `Expected ${n} thoughts to render ${html}, but found ${await editableCount(html)}. Rendered: ${JSON.stringify(rendered)}`,
    )
  }
}

/**
 * Waits for exactly the given number of thoughts to be selected by the multiselect. Reports how many were
 * highlighted on timeout, so a gesture that did not register is distinguishable from one that selected the
 * wrong range.
 */
const waitForMulticursor = async (n: number): Promise<void> => {
  /** Counts the bullets the multiselect has highlighted. */
  const highlighted = () =>
    browser.execute(() => document.querySelectorAll('[aria-label="bullet"][data-highlighted="true"]').length)

  try {
    await browser.waitUntil(async () => (await highlighted()) === n, { timeout: 10000, interval: 250 })
  } catch {
    throw new Error(`Expected ${n} thoughts to be selected, but ${await highlighted()} were.`)
  }
}

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

    // Close the picker, whose popover would otherwise sit over the swipes below.
    await tapToolbar('Text Color')

    // Select All (←↓→), which opens the Command Center on the selection, then tap Copy.
    await gesture('ldr')
    await waitForMulticursor(4)
    await waitForCommandCenterOpen()
    await tap(await waitForElement('[aria-label="Copy"]'), toolbarTapOptions)

    // Paste into a new subthought, which is where the issue's steps end. A sibling would be merged by #3622.
    await gesture('d')
    await waitForCommandCenterClosed()
    await gesture('rdr')
    await pasteFromEditMenu()

    // Each format should survive the round trip. Import normalizes a <font color> into an equivalent span,
    // so the pasted copies of Three and Four carry the style form rather than the attribute form.
    await waitForEditableCount('<u>One</u>', 2)
    await waitForEditableCount('<strike>Two</strike>', 2)
    await waitForEditableCount('<span style="color: #aa80ff;">Three</span>', 1)
    await waitForEditableCount('<span style="color: #000000;background-color: rgb(0, 199, 230);">Four</span>', 1)
  })
})
