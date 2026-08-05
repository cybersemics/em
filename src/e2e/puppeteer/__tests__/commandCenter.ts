import { KnownDevices } from 'puppeteer'
import openCommandCenterCommand from '../../../commands/openCommandCenter'
import click from '../helpers/click'
import clickThought from '../helpers/clickThought'
import emulate from '../helpers/emulate'
import gesture from '../helpers/gesture'
import paste from '../helpers/paste'
import waitForSelector from '../helpers/waitForSelector'
import waitUntil from '../helpers/waitUntil'
import { page } from '../session'

vi.setConfig({ testTimeout: 20000, hookTimeout: 20000 })

describe('command center', () => {
  beforeEach(async () => {
    await emulate(KnownDevices['iPhone 15 Pro'])
  }, 10000)

  // https://github.com/cybersemics/em/issues/3444
  it('creates a note when the Note command is tapped with a single thought selected', async () => {
    await paste('- Hello')
    await clickThought('Hello')

    await gesture(openCommandCenterCommand)
    await waitForSelector('[data-testid=command-center-panel]')

    await click('[data-testid="command-center-panel"] [aria-label="Note"]')

    // the Note command either creates the note or shows an error alert
    await waitUntil(() => !!document.querySelector('[aria-label="note"], [data-testid="alert-content"]'))

    const alertText = await page.evaluate(
      () => document.querySelector('[data-testid="alert-content"]')?.textContent ?? null,
    )
    expect(alertText).toBeNull()

    await waitForSelector('[aria-label="note"]')
  })
})
