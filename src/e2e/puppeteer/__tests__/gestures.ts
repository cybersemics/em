import { ElementHandle, KnownDevices } from 'puppeteer'
import newSubthoughtCommand from '../../../commands/newSubthought'
import newThoughtCommand from '../../../commands/newThought'
import { WindowEm } from '../../../initialize'
import exportThoughts from '../helpers/exportThoughts'
import gesture from '../helpers/gesture'
import keyboard from '../helpers/keyboard'
import paste from '../helpers/paste'
import waitForEditable from '../helpers/waitForEditable'
import waitUntil from '../helpers/waitUntil'
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

describe('drag to Home with duplicate thought', () => {
  beforeEach(async () => {
    await page.emulate(KnownDevices['iPhone 15 Pro'])
  })

  /** Counts the number of thoughts in an exported text string. */
  const countThoughts = (exported: string) => exported.split('\n').filter(line => /^\s*- /.test(line)).length

  /**
   * Regression test for: [Mobile] Unable to draw tracing after moving a duplicate thought to Home (root).
   *
   * When a thought (C) that already exists at root level is dragged from under a parent (B) to root above B,
   * the drag alert gets stuck and prevents gesture tracing from working afterward.
   */
  it('should allow gestures after moving a duplicate thought above the existing copy to Home', async () => {
    await paste(`
      - A
      - B
        - C
      - C
    `)

    // Get the first C in document order, which is the subthought C under B
    const subthoughtC = await waitForEditable('C')
    const subthoughtCBox = await subthoughtC.asElement()?.boundingBox()
    if (!subthoughtCBox) throw new Error('Bounding box not found for subthought C')

    // Get thought A to calculate the drag target position (between A and B = above B at root)
    const thoughtA = await waitForEditable('A')
    const thoughtABox = await thoughtA.asElement()?.boundingBox()
    if (!thoughtABox) throw new Error('Bounding box not found for thought A')

    // Find the bullet element within subthought C's container for the long press
    const bulletElement = await page.evaluateHandle(editableNode => {
      if (!editableNode) throw new Error('editableNode not found')
      const thoughtContainer = editableNode.closest('[aria-label="thought-container"]')
      if (!thoughtContainer) throw new Error('Thought container not found')
      const bullet = thoughtContainer.querySelector('[aria-label="bullet"]')
      if (!bullet) throw new Error('Bullet not found')
      return bullet
    }, subthoughtC)

    if (!(bulletElement instanceof ElementHandle)) throw new Error('Bullet element not found')

    const startX = subthoughtCBox.x + 1
    const startY = subthoughtCBox.y + subthoughtCBox.height / 2

    // Long press to activate drag
    await page.touchscreen.touchStart(startX, startY)

    // Wait for bullet to be highlighted (indicates drag has been activated)
    await page.waitForFunction(
      (bulletEl: Element) => bulletEl.getAttribute('data-highlighted') === 'true',
      { timeout: 5000 },
      bulletElement,
    )

    // Target position: just below thought A (between A and B at root level = above B)
    const targetX = thoughtABox.x + thoughtABox.width / 2
    const targetY = thoughtABox.y + thoughtABox.height + 5

    // Drag from subthought C upward to between A and B
    const steps = 20
    for (let i = 1; i <= steps; i++) {
      const curX = startX + ((targetX - startX) * i) / steps
      const curY = startY + ((targetY - startY) * i) / steps
      await page.touchscreen.touchMove(curX, curY)
    }

    await page.touchscreen.touchEnd()

    // Wait for the drag state to fully clear before proceeding
    await waitUntil(() => {
      const dragInProgress = document.querySelector('[data-drag-in-progress="true"]')
      const dragHold = document.querySelector('[data-drag-hold="true"]')
      return !dragInProgress && !dragHold
    })

    // Capture the thought count before attempting a gesture
    const beforeCount = countThoughts(await exportThoughts())

    // Attempt a gesture to create a new thought — this should work after the drag
    await gesture(newThoughtCommand)

    // Poll in the browser context until a new thought appears, confirming gesture tracing is functional
    await page.waitForFunction(
      (beforeCount: number) => {
        const em = window.em as WindowEm
        const exported = em.exportContext(['__ROOT__'], 'text/plain')
        return exported.split('\n').filter((line: string) => /^\s*- /.test(line)).length > beforeCount
      },
      { timeout: 5000 },
      beforeCount,
    )

    const afterCount = countThoughts(await exportThoughts())
    expect(afterCount).toBeGreaterThan(beforeCount)
  })
})
