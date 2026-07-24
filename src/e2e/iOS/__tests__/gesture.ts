/**
 * IOS Safari gesture tests.
 * Uses WDIO test runner with Mocha framework.
 */
import gestures from '../../../test-helpers/gestures'

interface PointerAction {
  type: string
  duration?: number
  x?: number
  y?: number
  button?: number
  origin?: string
}

/**
 * Traces the given gesture path with two fingers simultaneously.
 * The single-finger `gesture` helper cannot simulate multi-touch, so the two pointers are driven
 * directly via performActions. The primary finger follows the same path the single-finger helper
 * would, so the gesture would be recognized if multi-touch were not rejected.
 */
const twoFingerGesture = async (
  path: string,
  { segmentLength = 60, waitMs = 200 }: { segmentLength?: number; waitMs?: number } = {},
) => {
  const windowSize = await browser.getWindowSize()
  const xStart = windowSize!.width / 3
  const yStart = windowSize!.height / 2
  // Offset of the second finger from the first, kept small so both stay within the gesture zone.
  const secondFingerOffset = { x: 40, y: 40 }

  /** Builds the pointer action sequence for a finger offset by (offsetX, offsetY) from the primary path. */
  const buildActions = (offsetX: number, offsetY: number): PointerAction[] => {
    const actions: PointerAction[] = [
      {
        type: 'pointerMove',
        duration: 0,
        x: Math.round(xStart + offsetX),
        y: Math.round(yStart + offsetY),
        origin: 'viewport',
      },
      { type: 'pointerDown', button: 0 },
      { type: 'pause', duration: waitMs },
    ]

    let currentX = xStart
    let currentY = yStart
    for (const direction of Array.from(path)) {
      currentX += direction === 'r' ? segmentLength : direction === 'l' ? -segmentLength : 0
      currentY += direction === 'd' ? segmentLength : direction === 'u' ? -segmentLength : 0
      actions.push({
        type: 'pointerMove',
        duration: waitMs,
        x: Math.round(currentX + offsetX),
        y: Math.round(currentY + offsetY),
        origin: 'viewport',
      })
      actions.push({ type: 'pause', duration: waitMs })
    }

    actions.push({ type: 'pointerUp', button: 0 })
    return actions
  }

  await browser.performActions([
    { type: 'pointer', id: 'finger1', parameters: { pointerType: 'touch' }, actions: buildActions(0, 0) },
    {
      type: 'pointer',
      id: 'finger2',
      parameters: { pointerType: 'touch' },
      actions: buildActions(secondFingerOffset.x, secondFingerOffset.y),
    },
  ])
}

describe('Gesture', () => {
  // Regression test for #4233: two-finger tracing must not be interpreted as a gesture.
  it.skip('should not recognize a gesture when tracing with two fingers', async () => {
    // Trace the newThought gesture ('rd') with two fingers. Nothing should happen.
    await twoFingerGesture(gestures.newThought)

    // Allow time for a thought to render if the gesture were (incorrectly) recognized, so the
    // absence of an editable is a reliable signal rather than a race.
    await browser.pause(1000)

    // No new thought should have been created.
    const editableCount = await browser.execute(() => document.querySelectorAll('[data-editable]').length)
    expect(editableCount).toBe(0)
  })
})
