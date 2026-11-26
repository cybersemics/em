/**
 * IOS Safari swipe-back tests.
 * Uses WDIO test runner with Mocha framework.
 */
import exportThoughts from '../helpers/exportThoughts'
import getElementRectByScreen from '../helpers/getElementRectByScreen'
import newThought from '../helpers/newThought'
import resetApp from '../helpers/resetApp'
import swipeFromLeftEdge from '../helpers/swipeFromLeftEdge'
import tap from '../helpers/tap'
import tapToolbar from '../helpers/tapToolbar'
import waitForElement from '../helpers/waitForElement'

/** Opens another page and then em in the same tab, since Safari only offers swipe-back when there is a page to go back to. Returns the other page's URL, which a swipe-back would return to. */
const openAfterAnotherPage = async (): Promise<string> => {
  const appUrl = await browser.getUrl()
  const previousPageUrl = new URL('/favicon-32x32.png', appUrl).href
  await browser.url(previousPageUrl)
  await browser.url(appUrl)
  await resetApp()
  return previousPageUrl
}

describe('Safari swipe-back', () => {
  // https://github.com/cybersemics/em/issues/6272
  it('a swipe right from the left edge of the screen does not navigate back from a favorite in the sidebar', async () => {
    await openAfterAnotherPage()

    await newThought('hello')
    await tapToolbar('Add to Favorites')
    await tap(await waitForElement('[aria-label="menu"]'))
    await waitForElement('[data-testid="sidebar"]:not([inert])')
    const urlBeforeSwipe = await browser.getUrl()

    // Swipe along the favorite, which is a control that reaches the left edge of the screen.
    const favorite = await getElementRectByScreen(await waitForElement('[data-testid="drag-and-drop-favorite"]'))
    const y = favorite.y + favorite.height / 2

    // Safari ignores the first edge swipe after a page loads and navigates back on the second.
    await swipeFromLeftEdge({ y })
    await swipeFromLeftEdge({ y })
    expect(await browser.getUrl()).toBe(urlBeforeSwipe)

    // Close the sidebar by tapping the backdrop. This can only succeed if em is still the page on screen, so it rules
    // out a swipe-back that was still animating when the URL above was read.
    await tap(await waitForElement('[data-testid="sidebar"]'), { horizontalTapLine: 'right', x: -10 })
    await waitForElement('[data-testid="sidebar"][inert]')

    expect(await browser.getUrl()).toBe(urlBeforeSwipe)
  })

  // https://github.com/cybersemics/em/issues/6272
  it('a swipe right from the left edge of the screen does not navigate back on the home screen', async () => {
    const previousPageUrl = await openAfterAnotherPage()

    await newThought('hello')

    // Safari ignores the first edge swipe after a page loads and navigates back on the second. On the home screen the
    // swipe is also em's Back gesture, which moves the cursor up and so rewrites em's own URL, so the assertion is that
    // Safari did not go back to the previous page rather than that the URL is unchanged.
    await swipeFromLeftEdge()
    await swipeFromLeftEdge()
    expect(await browser.getUrl()).not.toBe(previousPageUrl)

    // Add a thought by gesture. This can only succeed if em is still the page on screen, so it rules out a swipe-back
    // that was still animating when the URL above was read.
    await newThought('world')
    expect(await exportThoughts()).toBe('\n- hello\n- world\n')
  })
})
