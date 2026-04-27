import { KnownDevices } from 'puppeteer'
import newSubthoughtCommand from '../../../commands/newSubthought'
import newThoughtCommand from '../../../commands/newThought'
import exportThoughts from '../helpers/exportThoughts'
import gesture from '../helpers/gesture'
import getEditingText from '../helpers/getEditingText'
import keyboard from '../helpers/keyboard'
import paste from '../helpers/paste'
import waitForEditable from '../helpers/waitForEditable'
import { page } from '../setup'

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

describe('chaining commands', () => {
  beforeEach(async () => {
    await page.emulate(KnownDevices['iPhone 15 Pro'])
  })

  it('chained command', async () => {
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

describe('cursor during gesture', () => {
  beforeEach(async () => {
    await page.emulate(KnownDevices['iPhone 15 Pro'])
  })

  /** Regression test for https://github.com/cybersemics/em/issues/3888. */
  it.skip('cursor should not move to a thought when a gesture starts on it', async () => {
    await paste(`
      - a
      - b
      - c
    `)

    // set cursor on a
    const aEditable = await waitForEditable('a')
    // @ts-expect-error - https://github.com/puppeteer/puppeteer/issues/8852
    await aEditable.asElement()?.click()

    // get the screen position of thought b
    const bEditable = await waitForEditable('b')
    const boundingBox = await bEditable.asElement()?.boundingBox()
    if (!boundingBox) throw new Error('Could not get bounding box of thought b')

    const x = boundingBox.x + boundingBox.width / 2
    const y = boundingBox.y + boundingBox.height / 2

    // start a downward gesture (↓) with touchStart directly on thought b
    await page.touchscreen.touchStart(x, y)
    for (let step = 1; step <= 8; step++) {
      await page.touchscreen.touchMove(x, y + step * 10)
    }
    await page.touchscreen.touchEnd()

    // cursor should not have moved to b
    const cursorText = await getEditingText()
    expect(cursorText).toBe('a')
  })
})
