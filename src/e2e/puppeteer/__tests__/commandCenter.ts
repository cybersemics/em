import { KnownDevices } from 'puppeteer'
import openCommandCenterCommand from '../../../commands/openCommandCenter'
import { WindowEm } from '../../../initialize'
import click from '../helpers/click'
import clickThought from '../helpers/clickThought'
import deviceEmulation from '../helpers/deviceEmulation'
import gesture from '../helpers/gesture'
import keyboard from '../helpers/keyboard'
import longPressThought from '../helpers/longPressThought'
import paste from '../helpers/paste'
import resetApp from '../helpers/resetApp'
import waitForAlertContent from '../helpers/waitForAlertContent'
import waitForEditable from '../helpers/waitForEditable'
import waitForSelector from '../helpers/waitForSelector'
import waitUntil from '../helpers/waitUntil'
import { page } from '../session'

vi.setConfig({ testTimeout: 20000, hookTimeout: 20000 })

deviceEmulation.useForSuite(KnownDevices['iPhone 15 Pro'])

describe('command center', () => {
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

  // https://github.com/cybersemics/em/issues/3445
  it('stays open when the Delete command is tapped', async () => {
    await paste(`
        - a
        - b
        `)
    await clickThought('a')

    await gesture(openCommandCenterCommand)
    await waitForSelector('[data-testid=command-center-panel]')

    await click('[data-testid="command-center-panel"] [aria-label="Delete"]')

    // wait for the thought to be deleted before asserting on the Command Center
    await waitForAlertContent('Deleted 1 thought')

    const showCommandCenter = await page.evaluate(
      () => (window.em as WindowEm).testHelpers.getState().showCommandCenter,
    )
    expect(showCommandCenter).toBe(true)
  })

  // When the user swipes up from the bottom edge of the screen to switch apps on iOS, the page receives a
  // touchstart on whatever thought is under the finger but no touchmove, since the system claims the gesture.
  // The press outlasts the long press timer, and the touchcancel that follows must not activate multiselect,
  // which would open the Command Center underneath the app switcher.
  it('does not open when the system cancels a touch during a long press (iOS app switcher gesture)', async () => {
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

    // the panel element stays mounted while closed, so check the state rather than the DOM
    const showCommandCenter = await page.evaluate(
      () => (window.em as WindowEm).testHelpers.getState().showCommandCenter,
    )
    expect(showCommandCenter).toBeFalsy()
  })

  // The iOS app switcher swipe can also be delivered to the page as a complete touch sequence
  // (touchstart → touchmove → touchend), which the gesture engine recognizes as the Open Command
  // Center gesture (swipe up) and commits right before the app suspends. Touches that begin in the
  // bottom system-gesture strip — present exactly on devices with a home indicator, i.e. a nonzero
  // safe-area-inset-bottom — must not start a gesture.
  it('does not open when a swipe starts at the bottom edge of the screen (iOS app switcher gesture)', async () => {
    await paste(`
        - a
        - b
        `)

    // the Open Command Center command requires a cursor
    await clickThought('a')

    // emulate a home-indicator device: the app reads the inset from the --safe-area-inset-bottom
    // custom property, which env(safe-area-inset-bottom) initializes on real devices
    await page.evaluate(() => document.documentElement.style.setProperty('--safe-area-inset-bottom', '34px'))

    const { innerWidth, innerHeight } = await page.evaluate(() => ({
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
    }))

    // swipe up starting at the very bottom of the viewport, as the app switcher swipe does
    await gesture('u', { xStart: innerWidth / 4, yStart: innerHeight - 5 })

    const showCommandCenter = await page.evaluate(
      () => (window.em as WindowEm).testHelpers.getState().showCommandCenter,
    )
    expect(showCommandCenter).toBeFalsy()

    // Chrome 151 keeps the compositor scroll from the uncanceled system gesture active after touchend,
    // so run the independent positive control in a fresh document as it would be after returning to the app.
    await resetApp()
    await paste(`
        - a
        - b
        `)
    await clickThought('a')
    await page.evaluate(() => document.documentElement.style.setProperty('--safe-area-inset-bottom', '34px'))

    // control: the same swipe starting above the system-gesture strip must still open the Command Center
    await gesture('u', { xStart: innerWidth / 4, yStart: innerHeight - 200 })
    await waitUntil(() => (window.em as WindowEm).testHelpers.getState().showCommandCenter)
  })
})
