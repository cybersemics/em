import { KnownDevices } from 'puppeteer'
import openCommandCenterCommand from '../../../commands/openCommandCenter'
import { WindowEm } from '../../../initialize'
import click from '../helpers/click'
import clickThought from '../helpers/clickThought'
import emulate from '../helpers/emulate'
import gesture from '../helpers/gesture'
import keyboard from '../helpers/keyboard'
import longPressThought from '../helpers/longPressThought'
import paste from '../helpers/paste'
import waitForEditable from '../helpers/waitForEditable'
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

    // the caret is placed in the new note, so typing goes into the note rather than back into the thought
    await keyboard.type('World')
    await waitUntil(() => document.querySelector('[aria-label="note-editable"]')?.textContent === 'World')
  })

  // When the user swipes up from the bottom edge of the screen to switch apps on iOS, the page receives a
  // touchstart on whatever thought is under the finger but no touchmove, since the system claims the gesture.
  // The press outlasts the long press timer, and the touchcancel that follows must not activate multiselect,
  // which would open the Command Center underneath the app switcher.
  it.skip('does not open when the system cancels a touch during a long press (iOS app switcher gesture)', async () => {
    await paste(`
        - a
        - b
        `)

    const a = await waitForEditable('a')
    await longPressThought(a, { cancel: true, edge: 'right' })

    // wait for the long press to fully wind down before asserting
    await waitUntil(() => (window.em as WindowEm).testHelpers.getState().longPress === 'Inactive')

    const highlightedBullets = await page.$$('[aria-label="bullet"][data-highlighted="true"]')
    expect(highlightedBullets.length).toBe(0)

    const panel = await page.$('[data-testid=command-center-panel]')
    expect(panel).toBeNull()
  })
})
