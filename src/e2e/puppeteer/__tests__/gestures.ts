import { ElementHandle, KnownDevices } from 'puppeteer'
import newSubthoughtCommand from '../../../commands/newSubthought'
import newThoughtCommand from '../../../commands/newThought'
import { WindowEm } from '../../../initialize'
import exportThoughts from '../helpers/exportThoughts'
import gesture from '../helpers/gesture'
import keyboard from '../helpers/keyboard'
import paste from '../helpers/paste'
import waitForAlertContent from '../helpers/waitForAlertContent'
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

describe('drag to Home with duplicate thought', () => {
  beforeEach(async () => {
    await page.emulate(KnownDevices['iPhone 15 Pro'])
  })

  /** Counts the number of thoughts in an exported text string. */
  const countThoughts = (exported: string) => exported.split('\n').filter(line => /^\s*- /.test(line)).length

  /**
   * Regression test for: [Mobile] Unable to draw tracing after moving a duplicate thought to Home (root).
   *
   * When subthought C (under B) is dragged to root level where C already exists, the drag-and-drop
   * handler in useDragAndDropThought exits early without clearing the longPress DragInProgress state.
   * This leaves shouldCancelGesture returning true, blocking all subsequent gesture tracing.
   *
   * Root cause: parentOf(rootThought.simplePath) is an empty array, so head([]) is undefined,
   * getThoughtById returns undefined, and the early `if (!parentThought) return` skips the alert
   * dispatch that would have been the only code path to clean up the stuck state.
   */
  it('should allow gestures after moving a duplicate thought above the existing copy to Home', async () => {
    await paste(`
      - A
      - B
        - C
      - C
    `)

    // Get the first C in document order — the subthought C under B (drag source)
    const subthoughtC = await waitForEditable('C')
    const subthoughtCBox = await subthoughtC.asElement()?.boundingBox()
    if (!subthoughtCBox) throw new Error('Bounding box not found for subthought C')

    // Get thought B — touching its drop zone causes C to be dropped before B at root level
    const thoughtBEditable = await waitForEditable('B')
    const thoughtBBox = await thoughtBEditable.asElement()?.boundingBox()
    if (!thoughtBBox) throw new Error('Bounding box not found for thought B')

    // Find the bullet element for subthought C to detect when the drag hold is activated
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

    // Initiate long press to start the drag
    await page.touchscreen.touchStart(startX, startY)

    // Wait for the bullet to be highlighted — this confirms React DnD's TouchBackend has fired
    // the dragStart event and DragInProgress state has been entered
    await page.waitForFunction(
      (bulletEl: Element) => bulletEl.getAttribute('data-highlighted') === 'true',
      { timeout: 5000 },
      bulletElement,
    )

    // Target: center of thought B's editable, which lies within B's aria-label="child" drop zone.
    // Dropping on a root-level thought triggers the buggy useDragAndDropThought drop handler.
    const targetX = thoughtBBox.x + thoughtBBox.width / 2
    const targetY = thoughtBBox.y + thoughtBBox.height / 2

    // Drag from subthought C up to thought B
    const steps = 20
    for (let i = 1; i <= steps; i++) {
      const curX = startX + ((targetX - startX) * i) / steps
      const curY = startY + ((targetY - startY) * i) / steps
      await page.touchscreen.touchMove(curX, curY)
    }

    // Wait for the drag-and-drop alert to confirm the drag is in progress and DnD is active
    await waitForAlertContent('Drag and drop')

    // Release — React DnD fires drop() for the target under the touch point.
    // With the bug: DnD prevents onTouchEnd from reaching React handlers, so longPress stays
    // as DragInProgress and shouldCancelGesture() returns true, blocking gesture tracing.
    await page.touchscreen.touchEnd()

    // Capture the thought count before attempting a gesture
    const beforeCount = countThoughts(await exportThoughts())

    // Attempt a gesture to create a new thought.
    // With the bug present, shouldCancelGesture() returns true (longPress !== Inactive),
    // MultiGesture abandons the gesture, and no new thought is created.
    await gesture(newThoughtCommand)

    // Poll for a new thought to appear — this times out and fails when the bug is present
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
