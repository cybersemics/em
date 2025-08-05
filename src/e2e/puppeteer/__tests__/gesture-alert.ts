import path from 'path'
import { KnownDevices } from 'puppeteer'
import sleep from '../../../util/sleep'
import configureSnapshots from '../configureSnapshots'
import screenshot from '../helpers/screenshot'
import waitForFrames from '../helpers/waitForFrames'
import { page } from '../setup'

expect.extend({
  toMatchImageSnapshot: configureSnapshots({ fileName: path.basename(__filename).replace('.ts', '') }),
})

vi.setConfig({ testTimeout: 20000, hookTimeout: 20000 })

/**
 * Helper function to smoothly move touch from one point to another.
 * Creates a series of touchMove events to simulate realistic gesture movement.
 *
 * @param x1 - Starting X coordinate.
 * @param y1 - Starting Y coordinate.
 * @param x2 - Ending X coordinate.
 * @param y2 - Ending Y coordinate.
 */
const move = async (x1: number, y1: number, x2: number, y2: number): Promise<void> => {
  const xDirection = x2 > x1 ? 10 : x1 > x2 ? -10 : 0
  const yDirection = y2 > y1 ? 10 : y1 > y2 ? -10 : 0
  let curX = x1
  let curY = y1

  while (curX * xDirection < x2 * xDirection || curY * yDirection < y2 * yDirection) {
    await page.touchscreen.touchMove(curX, curY)
    if (curX * xDirection < x2 * xDirection) {
      curX += xDirection
    }
    if (curY * yDirection < y2 * yDirection) {
      curY += yDirection
    }
  }
}

/**
 * Helper function to perform an incomplete gesture - Create New Subthought (without touchEnd).
 * This simulates a gesture that is started but not completed, which should not trigger any alerts.
 * The gesture follows the pattern: right → down → right (likely matches a valid command).
 *
 * Note: No touchEnd() is called, so the gesture remains incomplete.
 */
const performIncompleteGesture = async () => {
  const x = 100
  const y = 300
  await page.touchscreen.touchStart(x, y)
  // Touch move right
  await move(x, y, x + 100, y)
  // Touch move down
  await move(x + 100, y, x + 100, y + 100)
  // Touch move right
  await move(x + 100, y + 100, x + 200, y + 100)
  // Note: No touchEnd() - gesture is incomplete
}

/**
 * Helper function to perform a complete gesture.
 * This simulates a full gesture that should trigger an alert after completion.
 * Uses the same gesture pattern as performIncompleteGesture but adds touchEnd().
 */
const performCompleteGesture = async () => {
  await performIncompleteGesture()
  await page.touchscreen.touchEnd()
}

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
describe('gesture alert behavior', () => {
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
    // Perform an incomplete gesture (no touchEnd)
    await performIncompleteGesture()

    // Wait a bit to ensure any potential alerts would have time to appear
    await sleep(1000)

    await waitForFrames()

    // Check that no alert content is visible during gesture progress
    const alertContent = await page.$('[data-testid=alert-content]')
    expect(alertContent).toBeNull()

    // Take screenshot to verify visual state
    const screenshotData = await screenshot()
    expect(screenshotData).toMatchImageSnapshot({ customSnapshotIdentifier: 'no-alert-during-gesture' })
  })

  /**
   * Test that verifies alert appears after gesture completion.
   *
   * This test ensures that when a user completes a gesture (with touchEnd event),
   * an alert should be shown to provide feedback about the executed command.
   * This confirms that alerts are properly triggered after gesture completion.
   */
  it('should show alert after gesture completion', async () => {
    // Perform a complete gesture
    await performCompleteGesture()

    // Wait for the alert to appear
    await sleep(1000)

    await waitForFrames()

    // Check that alert content is visible after gesture completion
    const alertContent = await page.$('[data-testid=alert-content]')
    expect(alertContent).not.toBeNull()

    // Verify alert content contains gesture hint text
    const alertText = await page.$eval('[data-testid=alert-content]', el => el.textContent)
    expect(alertText).toBeTruthy()

    // Take screenshot to verify visual state with alert
    const screenshotData = await screenshot()
    expect(screenshotData).toMatchImageSnapshot({ customSnapshotIdentifier: 'alert-after-gesture-completion' })
  })
})
