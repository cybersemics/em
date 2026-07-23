/** Native iOS gesture regression tests. */
import $ from '../helpers/$'
import gesture, { endGesture } from '../helpers/gesture'
import getSelection from '../helpers/getSelection'
import getSelectionEndHandlePosition from '../helpers/getSelectionEndHandlePosition'
import keyboard from '../helpers/keyboard'
import newThought from '../helpers/newThought'
import setSelection from '../helpers/setSelection'
import waitForEditable from '../helpers/waitForEditable'

describe('Gestures', () => {
  it('does not execute a gesture that starts in the scroll zone (#4536)', async () => {
    const { height, width } = await browser.getWindowSize()

    try {
      await gesture('lurd', {
        hold: true,
        segmentLengths: [Math.round(width / 3), Math.round(height / 4), 40, 120],
        waitMs: 300,
        xStart: width - Math.round(width / 8),
        yStart: Math.round((height * 2) / 3),
      })

      const gestureMenu = await $('[data-testid=popup-value]')
      expect(await gestureMenu.isExisting()).toBe(false)
    } finally {
      await endGesture()
    }
  })

  it('keeps native text selection active without opening the gesture menu when dragging an end handle (#4521)', async () => {
    const text = 'one two three four five six seven eight nine ten'
    await newThought()
    await keyboard.type(text)
    await waitForEditable(text)
    expect(await setSelection(0, 3)).toMatchObject({ text: 'one', type: 'Range' })

    const handle = await getSelectionEndHandlePosition()
    await gesture('d', { segmentLength: 90, waitMs: 600, xStart: handle.x, yStart: handle.y })

    const gestureMenu = await $('[data-testid=popup-value]')
    expect(await gestureMenu.isExisting()).toBe(false)

    expect(await getSelection().toString()).toContain('one two')
  })
})
