import { KnownDevices } from 'puppeteer'
import swipe from '../helpers/swipe'
import waitForFrames from '../helpers/waitForFrames'
import { page } from '../setup'

vi.setConfig({ testTimeout: 20000, hookTimeout: 20000 })

/**
 * Helper function to perform an incomplete gesture - Create New Subthought (without touchEnd).
 * This simulates a gesture that is started but not completed, which should not trigger any alerts.
 * The gesture follows the pattern: right → down → right (likely matches a valid command).
 *
 * Note: No touchEnd() is called, so the gesture remains incomplete.
 */
const performIncompleteGesture = async () => {
  // Note: gesture is incomplete
  await swipe('rdr', false)
}

/**
 * Helper function to perform a complete gesture.
 * This simulates a full gesture that should trigger an alert after completion.
 * Uses the same gesture pattern as performIncompleteGesture but adds touchEnd().
 */
const performCompleteGesture = async () => {
  await swipe('rdr', true)
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

    await waitForFrames()

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
    // Perform a complete gesture
    await performCompleteGesture()

    await waitForFrames()

    // Check that alert content is visible after gesture completion
    const alertContent = await page.$('[data-testid=alert-content]')
    expect(alertContent).not.toBeNull()

    // Verify alert content contains gesture hint text
    const alertText = await page.$eval('[data-testid=alert-content]', el => el.textContent)
    expect(alertText).toBeTruthy()
  })
})
