import { type ConsoleMessage, KnownDevices } from 'puppeteer'
import newSubthoughtCommand from '../../../commands/newSubthought'
import newThoughtCommand from '../../../commands/newThought'
import $ from '../helpers/$'
import exportThoughts from '../helpers/exportThoughts'
import gesture, { endGesture, startGesture } from '../helpers/gesture'
import reloadWithProductionTiming from '../helpers/initialize'
import keyboard from '../helpers/keyboard'
import paste from '../helpers/paste'
import scrollTo from '../helpers/scrollTo'
import waitForSelector from '../helpers/waitForSelector'
import { page } from '../session'

vi.setConfig({ testTimeout: 20000, hookTimeout: 20000 })

/**
 * Test suite for gesture alert behavior.
 *
 * These tests verify that gesture alerts follow the correct timing:
 * - No alerts should appear during gesture progress
 * - Alerts should appear only after gesture completion.
 *
 * This ensures a clean user experience where alerts don't interfere
 * with ongoing gesture interactions.
 */
describe('alerts', () => {
  beforeEach(async () => {
    await page.emulate(KnownDevices['iPhone 15 Pro'])
  })

  /**
   * Test that verifies no alert appears during gesture progress.
   *
   * This test ensures that when a user starts a gesture but doesn't complete it
   * (no touchEnd event), no alert should be shown. This prevents alerts from
   * appearing prematurely and interfering with the gesture interaction.
   */
  it('should not show alert during gesture progress', async () => {
    // Perform an incomplete gesture (no touchEnd) - create a new thought
    await gesture(newSubthoughtCommand, { hold: true })

    // Check that no alert content is visible during gesture progress
    const alertContent = await page.$('[data-testid=alert-content]')
    expect(alertContent).toBeNull()
  })

  /**
   * Test that verifies alert appears after gesture completion.
   *
   * This test ensures that when a user completes a gesture (with touchEnd event),
   * an alert should be shown to provide feedback about the executed command.
   * This confirms that alerts are properly triggered after gesture completion.
   */
  it('should show alert after gesture completion', async () => {
    // Perform a complete gesture - create a new thought
    await gesture(newSubthoughtCommand)

    // Check that alert content is visible after gesture completion
    const alertContent = await page.$('[data-testid=alert-content]')
    expect(alertContent).not.toBeNull()

    // Verify alert content contains gesture hint text
    const alertText = await page.$eval('[data-testid=alert-content]', el => el.textContent)
    expect(alertText).toBeTruthy()
  })
})

describe('gestures', () => {
  beforeEach(async () => {
    await page.emulate(KnownDevices['iPhone 15 Pro'])
  })

  // https://github.com/cybersemics/em/issues/3887
  it('releases a gesture when its loading target unmounts', async () => {
    await reloadWithProductionTiming()
    await waitForSelector('[data-loading-indicator]')

    try {
      await gesture('d', { hold: true, target: '[data-loading-indicator]' })
      await waitForSelector('[data-testid=popup-value]')

      await waitForSelector('[data-loading-indicator]', { hidden: true })
    } finally {
      await endGesture()
    }

    await waitForSelector('[data-testid=popup-value]', { hidden: true })
    expect(await $('[data-testid=popup-value]')).toBeNull()
  })

  // https://github.com/cybersemics/em/issues/4536
  it('does not activate a gesture that starts in the scroll zone', async () => {
    await paste(`
      - thought 1
      - thought 2
      - thought 3
      - thought 4
      - thought 5
      - thought 6
      - thought 7
      - thought 8
      - thought 9
      - thought 10
      - thought 11
      - thought 12
      - thought 13
      - thought 14
      - thought 15
      - thought 16
      - thought 17
      - thought 18
      - thought 19
      - thought 20
      - thought 21
      - thought 22
      - thought 23
      - thought 24
      - thought 25
      - thought 26
      - thought 27
      - thought 28
      - thought 29
      - thought 30
    `)

    // Scroll partway down so the swipe has room to scroll further and a baseline to measure from.
    await scrollTo(0, 100)

    expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0)
    const viewport = page.viewport()!
    const xStart = viewport.width - Math.round(viewport.width / 8)
    const yStart = Math.round(viewport.height / 3)
    const traceClassBefore = await page.$eval('[data-testid=gesture-trace]', element => element.className)
    const exportedBefore = await exportThoughts()

    const activeGesture = await startGesture({ xStart, yStart })
    await activeGesture.move('u')
    await page.evaluate(() => new Promise(requestAnimationFrame))

    // Draw New Thought (rd) with the rest of the touch. If the abandoned gesture is wrongly
    // re-activated after scrolling takes over the touch responder (#4536), the tail is recognized
    // as a command and executes on release. A short right segment keeps the touch on screen from
    // its right-edge start.
    await activeGesture.move('r', { segmentLength: 40 })
    await activeGesture.move('d')
    await page.evaluate(() => new Promise(requestAnimationFrame))

    expect(await page.$eval('[data-testid=gesture-trace]', element => element.className)).toBe(traceClassBefore)

    // Commands execute when the touch is released, so the release is part of the behavior under
    // test. There is no cleanup concern in moving it out of a finally: the page is closed after
    // every test, so a failed assertion cannot leak the held touch into another test.
    await activeGesture.end()

    expect(await exportThoughts()).toBe(exportedBefore)
  })
})

describe('chaining commands', () => {
  beforeEach(async () => {
    await page.emulate(KnownDevices['iPhone 15 Pro'])
  })

  it('chained command', async () => {
    const warnings: string[] = []
    /** Collect browser warnings emitted during the chained gesture. */
    const onConsole = (message: ConsoleMessage) => {
      if (message.type() === 'warn') {
        warnings.push(message.text())
      }
    }

    page.on('console', onConsole)

    try {
      await gesture(newThoughtCommand)
      await keyboard.type('a')
      await gesture(newSubthoughtCommand)
      await keyboard.type('b')

      // New Thought + Outdent
      await gesture('rd' + 'lrl')

      const exported1 = await exportThoughts()
      expect(exported1).toBe(`
- a
  - b
- 
`)
      expect(warnings.some(message => message.includes('IndexSizeError'))).toBe(false)
    } finally {
      page.off('console', onConsole)
    }
  })

  it('prioritize exact match over chained command', async () => {
    await gesture(newThoughtCommand)
    await keyboard.type('a')
    await gesture(newSubthoughtCommand)

    const exported1 = await exportThoughts()
    expect(exported1).toBe(`
- a
  - 
`)
  })
})
