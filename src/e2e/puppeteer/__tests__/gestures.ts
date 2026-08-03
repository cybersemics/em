import { type ConsoleMessage, KnownDevices } from 'puppeteer'
import newSubthoughtCommand from '../../../commands/newSubthought'
import newThoughtCommand from '../../../commands/newThought'
import clickThought from '../helpers/clickThought'
import command from '../helpers/command'
import exportThoughts from '../helpers/exportThoughts'
import gesture from '../helpers/gesture'
import keyboard from '../helpers/keyboard'
import paste from '../helpers/paste'
import setSelection from '../helpers/setSelection'
import waitForState from '../helpers/waitForState'
import waitUntil from '../helpers/waitUntil'
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

describe('gesture menu', () => {
  beforeEach(async () => {
    await page.emulate(KnownDevices['iPhone 15 Pro'])
  })

  // The native iOS text-selection callout (Cut | Copy | Paste) overlaps the gesture menu. Hide the
  // selection while the gesture menu is onscreen, then restore it when the menu is dismissed so that a
  // cancelled gesture leaves the editor exactly as it was. See #3745.
  it('hides the text selection while the gesture menu is shown and restores it when dismissed', async () => {
    await paste('Hello world')
    await clickThought('Hello world')

    // Focus the editable before selecting, otherwise the browser discards the selection on a
    // non-focused contenteditable under mobile emulation.
    await page.evaluate(() =>
      (document.querySelector('[data-editing=true] [data-editable]') as HTMLElement | null)?.focus(),
    )

    // select the word "Hello"
    await setSelection(0, 5)
    await waitUntil(() => window.getSelection()?.toString() === 'Hello')

    // open the gesture menu
    await command('gestureMenu')
    await waitForState('showGestureMenu', true)

    // the selection is hidden (its ranges removed) while the gesture menu is onscreen
    await waitUntil(() => window.getSelection()?.rangeCount === 0)

    // dismiss the gesture menu
    await command('gestureMenu')
    await waitForState('showGestureMenu', false)

    // the selection is restored exactly as it was when the gesture menu is dismissed
    await waitUntil(() => window.getSelection()?.toString() === 'Hello')
    const selected = await page.evaluate(() => window.getSelection()?.toString())
    expect(selected).toBe('Hello')
  })
})
