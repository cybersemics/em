import type { Element } from 'webdriverio'
import clickThought from '../helpers/clickThought'
import gesture from '../helpers/gesture'
import getElementRectByScreen from '../helpers/getElementRectByScreen'
import getNativeElementRect from '../helpers/getNativeElementRect'
import paste from '../helpers/paste'
import tap from '../helpers/tap'
import waitForCommandCenterOpen from '../helpers/waitForCommandCenterOpen'
import waitForElement from '../helpers/waitForElement'

/** The y coordinate of the top of the virtual keyboard, in the screen coordinates element rects are compared in. */
const keyboardTop = async (): Promise<number> => (await getNativeElementRect('//XCUIElementTypeKeyboard')).y

/**
 * Waits for an element's bottom edge to come to rest above the virtual keyboard, and reports where it actually
 * settled if it does not. The drawer rises on a spring that approximates the keyboard's own, so the first frames
 * after the field is focused still have both in motion.
 */
const waitForElementAboveKeyboard = async (element: Element): Promise<void> => {
  /** The gap between the element's bottom edge and the top of the keyboard. Negative while the keyboard covers it. */
  const gap = async () => {
    const rect = await getElementRectByScreen(element)
    return (await keyboardTop()) - (rect.y + rect.height)
  }

  try {
    await browser.waitUntil(async () => (await gap()) >= 0, { timeout: 10000, interval: 250 })
  } catch {
    throw new Error(`Expected the element to rest above the keyboard, but it stopped ${-(await gap())}px behind it.`)
  }
}

describe('Command Center', () => {
  it('lifts the expanded drawer above the virtual keyboard when the search field is focused', async () => {
    await paste('- a')
    await clickThought('a')

    // Open the Command Center on the selection, then expand it to the stage that carries the search field.
    await gesture('u')
    await waitForCommandCenterOpen()
    await tap(await waitForElement('[data-testid=command-center-expand]'))

    const search = await waitForElement('[placeholder="Search commands..."]')
    await tap(search)

    // The drawer is anchored to the bottom of the viewport, which is where the keyboard it just raised now is. Em
    // lifts it by the keyboard height so the search field and the commands below it stay reachable; without the lift
    // the field sits behind the keyboard and only the drawer's header is left on screen.
    await waitForElementAboveKeyboard(search)
  })
})
