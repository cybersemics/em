import { KnownDevices } from 'puppeteer'
import click from '../helpers/click'
import clickThought from '../helpers/clickThought'
import closeKeyboard from '../helpers/closeKeyboard'
import deviceEmulation from '../helpers/deviceEmulation'
import paste from '../helpers/paste'
import waitForCursor from '../helpers/waitForCursor'
import { page } from '../session'

vi.setConfig({ testTimeout: 20000, hookTimeout: 20000 })

/** Returns the aria-label of the focused element, or its tag name if it has none. */
const getActiveElementLabel = () =>
  page.evaluate(() => document.activeElement?.getAttribute('aria-label') ?? document.activeElement?.tagName ?? null)

describe('mobile', () => {
  deviceEmulation.useForSuite(KnownDevices['iPhone 15 Pro'])

  // https://github.com/cybersemics/em/issues/4827
  it.skip("move the cursor to the note's thought without opening the keyboard on the first tap of a note", async () => {
    await paste(`
      - a
      - b
        - =note
          - test
    `)
    await clickThought('a')
    await waitForCursor('a')
    await closeKeyboard()

    await click('[aria-label="note-editable"]')
    await waitForCursor('b')

    // The keyboard stays closed, so the note editable does not take focus.
    expect(await getActiveElementLabel()).toBe('BODY')
  })

  it('open the keyboard on the second tap of a note', async () => {
    await paste(`
      - a
      - b
        - =note
          - test
    `)
    await clickThought('a')
    await waitForCursor('a')
    await closeKeyboard()

    await click('[aria-label="note-editable"]')
    await waitForCursor('b')
    await click('[aria-label="note-editable"]')

    expect(await getActiveElementLabel()).toBe('note-editable')
  })
})
