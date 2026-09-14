import { KnownDevices } from 'puppeteer'
import click from '../helpers/click'
import deviceEmulation from '../helpers/deviceEmulation'
import dragAndDropThoughtTouch from '../helpers/dragAndDropThoughtTouch'
import getEditingText from '../helpers/getEditingText'
import paste from '../helpers/paste'
import tapThought from '../helpers/tapThought'
import waitForAlert from '../helpers/waitForAlert'
import waitForBrowserSettled from '../helpers/waitForBrowserSettled'
import waitForCursor from '../helpers/waitForCursor'

vi.setConfig({ testTimeout: 20000, hookTimeout: 20000 })

deviceEmulation.useForSuite(KnownDevices['iPhone 15 Pro'])

describe('alert', () => {
  // https://github.com/cybersemics/em/issues/5461
  it('tapping the destination link in the moved alert sets the cursor', async () => {
    await paste(`
      - a
        - a1
      - b
    `)

    // Expand a so that a1 is rendered and can be dropped onto. A non-root destination is what renders the destination
    // as a link rather than as plain "home" text.
    await tapThought('a')
    await waitForCursor('a')

    await dragAndDropThoughtTouch('b', 'a1', { position: 'before' })
    await waitForAlert('"b" moved to "a"')

    // Move the cursor off the destination so that the effect of tapping the link is observable.
    await tapThought('a1')
    await waitForCursor('a1')

    await click('[data-testid=alert-content] [data-thought-link]')
    await waitForBrowserSettled()

    expect(await getEditingText()).toBe('a')
  })
})
