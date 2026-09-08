import { type ConsoleMessage, ElementHandle, KnownDevices } from 'puppeteer'
import newSubthoughtCommand from '../../../commands/newSubthought'
import newThoughtCommand from '../../../commands/newThought'
import $ from '../helpers/$'
import clickThought from '../helpers/clickThought'
import command from '../helpers/command'
import deviceEmulation from '../helpers/deviceEmulation'
import exportThoughts from '../helpers/exportThoughts'
import gesture, { startGesture } from '../helpers/gesture'
import keyboard from '../helpers/keyboard'
import paste from '../helpers/paste'
import scrollTo from '../helpers/scrollTo'
import setConnectionStatus from '../helpers/setConnectionStatus'
import setSelection from '../helpers/setSelection'
import waitForAlert from '../helpers/waitForAlert'
import waitForCursor from '../helpers/waitForCursor'
import waitForEditable from '../helpers/waitForEditable'
import waitForSelector from '../helpers/waitForSelector'
import waitUntil from '../helpers/waitUntil'
import { page } from '../session'

vi.setConfig({ testTimeout: 20000, hookTimeout: 20000 })

deviceEmulation.useForSuite(KnownDevices['iPhone 15 Pro'])

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
  // https://github.com/cybersemics/em/issues/3887
  it('releases a gesture whose touch target unmounts mid-gesture', async () => {
    // The loading indicator is the element that unmounts under the user's finger in the reported
    // bug: it is replaced by the thoughtspace once content loads.
    await setConnectionStatus('connecting')
    await waitForSelector('[data-loading-indicator]', { timeout: 8000 })

    const activeGesture = await startGesture({ target: '[data-loading-indicator]' })
    await activeGesture.move('d')
    await waitForSelector('[data-testid=popup-value]', { timeout: 8000 })

    // Unmount the touch target while the touch is still held. 'offline' rather than 'connected':
    // EmptyThoughtspace keeps the indicator mounted while state.isLoading is true unless the status
    // is 'offline'. isLoading is not under the test's control and stays true for the whole run in
    // CI, so 'connected' leaves the indicator mounted and this wait never resolves.
    await setConnectionStatus('offline')
    await waitForSelector('[data-loading-indicator]', { hidden: true, timeout: 8000 })

    await activeGesture.end()

    // Bounded wait so that a stuck menu fails the assertion below rather than the runner's timeout.
    await waitForSelector('[data-testid=popup-value]', { hidden: true, timeout: 5000 }).catch(() => undefined)
    expect(await $('[data-testid=popup-value]')).toBeNull()
  })

  // https://github.com/cybersemics/em/issues/4536
  it('does not activate a gesture that starts in the scroll zone', async () => {
    // Enough thoughts to make the page scrollable. Declared once so the closing assertion compares
    // against the known fixture rather than against a second export of the app's own state.
    const outline = `
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
`
    await paste(outline)

    // Scroll partway down so the swipe has room to scroll further and a baseline to measure from.
    await scrollTo(0, 100)

    expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0)
    const viewport = page.viewport()!
    const xStart = viewport.width - Math.round(viewport.width / 8)
    const yStart = Math.round(viewport.height / 3)

    const scrollYBefore = await page.evaluate(() => window.scrollY)
    const activeGesture = await startGesture({ xStart, yStart })
    await activeGesture.move('u')

    // A swipe in the scroll zone must scroll the page. Waiting for the scroll also guarantees the
    // browser has taken over the touch before the rest of the moves — the condition under which a
    // wrongly re-activated gesture (#4536) would begin.
    await page.waitForFunction((before: number) => window.scrollY > before, {}, scrollYBefore)

    // Draw New Thought (rd) with the rest of the touch. If the abandoned gesture is wrongly
    // re-activated after scrolling takes over the touch responder (#4536), the tail is recognized
    // as a command and executes on release. A short right segment keeps the touch on screen from
    // its right-edge start.
    await activeGesture.move('r', { segmentLength: 40 })
    await activeGesture.move('d')

    // The gesture trace must stay hidden. A wrongly re-activated gesture (#4536) always updates
    // the gesture store and shows the trace, even when its re-tracked sequence happens not to form
    // a command — so this is the reliable mid-touch signal of re-activation, while the export
    // comparison after release catches the command execution itself.
    expect(await page.$eval('[data-testid=gesture-trace]', element => getComputedStyle(element).opacity)).toBe('0')

    // The gesture menu must not appear while the touch is held.
    expect(await $('[data-testid=popup-value]')).toBeNull()

    // Commands execute when the touch is released, so the release is part of the behavior under
    // test. There is no cleanup concern in moving it out of a finally: the page is closed after
    // every test, so a failed assertion cannot leak the held touch into another test.
    await activeGesture.end()

    expect(await exportThoughts()).toBe(outline)
  })
})

describe('chaining commands', () => {
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

describe('drag to Home with duplicate thought', () => {
  // https://github.com/cybersemics/em/issues/4044
  // Dragging a subthought to the root next to a copy of itself once left longPress stuck at
  // DragInProgress, so shouldCancelGesture abandoned every later swipe until the cursor was moved by
  // hand. The endDrag reset added in #4374 clears longPress however the drag concludes, and this
  // holds that line for the duplicate case.
  it('should draw a gesture after a duplicate subthought is dragged to Home above the existing copy', async () => {
    await paste(`
      - A
      - B
        - C
      - C
    `)

    // Put the cursor on the subthought C, as the reported steps do. B has to be expanded first: a
    // collapsed thought renders no children at all, so without this the drag would grab the
    // root-level C, which reproduces nothing.
    await clickThought('B')
    await waitForCursor('B')
    await clickThought('C')
    await waitForCursor('C')

    // waitForEditable returns the first match in document order, which is now the subthought.
    const subthoughtC = await waitForEditable('C')
    const source = await subthoughtC.asElement()?.boundingBox()
    if (!source) throw new Error('Bounding box not found for subthought C')

    const thoughtB = await waitForEditable('B')
    const destination = await thoughtB.asElement()?.boundingBox()
    if (!destination) throw new Error('Bounding box not found for thought B')

    // The bullet is highlighted when the long press activates, which is the point at which react-dnd
    // TouchBackend has begun the drag.
    const bullet = await page.evaluateHandle(editable => {
      if (!editable) throw new Error('Editable not found for subthought C')
      const thoughtContainer = editable.closest('[aria-label="thought-container"]')
      if (!thoughtContainer) throw new Error('Thought container not found for subthought C')
      const bulletElement = thoughtContainer.querySelector('[aria-label="bullet"]')
      if (!bulletElement) throw new Error('Bullet not found for subthought C')
      return bulletElement
    }, subthoughtC)
    if (!(bullet instanceof ElementHandle)) throw new Error('Bullet element not found for subthought C')

    const startX = source.x + 1
    const startY = source.y + source.height / 2

    // Drop above B at the root. These are the coordinates dragAndDropThought uses for position
    // 'before', which land on B's own drop target rather than a neighbour's.
    const endX = destination.x + destination.width / 1.25
    const endY = destination.y

    await page.touchscreen.touchStart(startX, startY)
    await page.waitForFunction(
      (bulletElement: Element) => bulletElement.getAttribute('data-highlighted') === 'true',
      { timeout: 5000 },
      bullet,
    )

    const steps = 20
    for (let i = 1; i <= steps; i++) {
      await page.touchscreen.touchMove(startX + ((endX - startX) * i) / steps, startY + ((endY - startY) * i) / steps)
    }

    await waitForAlert('Drag and drop')
    await page.touchscreen.touchEnd()

    // The move alert replaces the drag alert once the drop has been applied. It only reports that a
    // move happened — the destination is left to the outline assertion below, because the alert
    // misnames the root as "" (parentOf a root thought's simplePath is an empty path).
    await waitForAlert('moved to')

    // Draw New Thought without moving the cursor first. Moving it is the workaround the issue
    // reports, so the gesture has to be drawn straight after the drop for this to prove anything.
    await gesture(newThoughtCommand)

    // New Thought creates an empty thought and puts the cursor on it. A stuck longPress makes
    // shouldCancelGesture abandon the swipe instead, leaving the cursor where the drop left it.
    await waitForCursor('')

    expect(await exportThoughts()).toBe(`
- A
- C
- 
- B
- C
`)
  })
})

describe('gesture menu', () => {
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
    await waitForSelector('[data-testid=popup-value]')

    // the selection is hidden (its ranges removed) while the gesture menu is onscreen
    await waitUntil(() => window.getSelection()?.rangeCount === 0)

    // dismiss the gesture menu
    await command('gestureMenu')
    await waitForSelector('[data-testid=popup-value]', { hidden: true })

    // the selection is restored exactly as it was when the gesture menu is dismissed
    await waitUntil(() => window.getSelection()?.toString() === 'Hello')
    const selected = await page.evaluate(() => window.getSelection()?.toString())
    expect(selected).toBe('Hello')
  })
})
