/** Native iOS gesture tests. Runs on iOS 27, whose WebKit withholds touches near a selection. */
import disableTransitions from '../helpers/disableTransitions'
import gesture from '../helpers/gesture'
import getEditingText from '../helpers/getEditingText'
import getScreenOffsetY from '../helpers/getScreenOffsetY'
import getSelection from '../helpers/getSelection'
import isKeyboardShown from '../helpers/isKeyboardShown'
import paste from '../helpers/paste'
import tap from '../helpers/tap'
import waitForEditable from '../helpers/waitForEditable'
import waitForScrollIdle from '../helpers/waitForScrollIdle'
import waitUntil from '../helpers/waitUntil'

describe('Gestures', () => {
  // https://github.com/cybersemics/em/issues/6077
  it.skip('does not scroll the document when a drag starts near a selection', async () => {
    /** Generates n sibling thoughts named prefix0, prefix1, …. */
    const filler = (prefix: string, n: number) => Array.from({ length: n }, (_, i) => `- ${prefix}${i}`).join('\n')
    await disableTransitions()
    // room below One, so that the drag has something to scroll
    await paste(`${filler('x', 8)}\n- One\n${filler('y', 25)}`)
    // paste scrolls to the last imported thought
    await waitForScrollIdle()

    const editable = await waitForEditable('One')
    await browser.execute((el: HTMLElement) => el.scrollIntoView({ block: 'center', behavior: 'instant' }), editable)
    await tap(editable, { pointerType: 'touch' })
    await waitUntil(async () => (await getEditingText()) === 'One')
    await tap(editable, { pointerType: 'touch' })
    await waitUntil(isKeyboardShown)

    await tap(editable, { offset: 'One'.length, pointerType: 'touch', count: 2 })
    await waitUntil(async () => (await getSelection().toString()) === 'One')
    // Safari may still be scrolling the focused thought into view after the keyboard appears
    await waitForScrollIdle()
    // an upward drag scrolls down, so there must be room below
    expect(
      await browser.execute(() => window.scrollY + window.innerHeight < document.documentElement.scrollHeight),
    ).toBe(true)

    const scrollBefore = await browser.execute(() => window.scrollY)
    const selectionEnd = await browser.execute(() => {
      const rect = document.getSelection()!.getRangeAt(0).getBoundingClientRect()
      return { x: rect.right, y: rect.top + rect.height / 2 }
    })

    // On a device the double tap's last touchend is withheld until the drag begins, which is what lets the drag scroll.
    // BrowserStack delivers it, so a tap beside the selection takes its place.
    await tap(editable, { offset: 'One'.length, x: 20, pointerType: 'touch' })
    // within the 44pt around the end of the selection in which iOS 27 withholds touches
    await gesture('u', {
      xStart: selectionEnd.x + 20,
      yStart: selectionEnd.y + (await getScreenOffsetY()),
      segmentLength: 150,
      waitMs: 150,
    })

    // scrollY drifts by a pixel even when the drag is blocked
    const scrollAfter = await browser.execute(() => window.scrollY)
    expect(Math.abs(scrollAfter - scrollBefore)).toBeLessThanOrEqual(1)
  })
})
