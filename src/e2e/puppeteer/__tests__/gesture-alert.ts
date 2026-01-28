import { KnownDevices } from 'puppeteer'
import newSubthoughtCommand from '../../../commands/newSubthought'
import gesture from '../helpers/gesture'
import waitForFrames from '../helpers/waitForFrames'
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
    // Perform an incomplete gesture (no touchEnd) - create a new thought
    await gesture(newSubthoughtCommand, { hold: true })

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
    // Perform a complete gesture - create a new thought
    await gesture(newSubthoughtCommand)

    await waitForFrames()

    // Check that alert content is visible after gesture completion
    const alertContent = await page.$('[data-testid=alert-content]')
    expect(alertContent).not.toBeNull()

    // Verify alert content contains gesture hint text
    const alertText = await page.$eval('[data-testid=alert-content]', el => el.textContent)
    expect(alertText).toBeTruthy()
  })
})
