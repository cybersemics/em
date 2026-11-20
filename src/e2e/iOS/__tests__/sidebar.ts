/**
 * IOS Safari sidebar tests.
 * Uses WDIO test runner with Mocha framework.
 */
import newThought from '../helpers/newThought'
import resetApp from '../helpers/resetApp'
import swipeFromLeftEdge from '../helpers/swipeFromLeftEdge'
import tap from '../helpers/tap'
import tapToolbar from '../helpers/tapToolbar'
import waitForElement from '../helpers/waitForElement'

describe('Sidebar', () => {
  // https://github.com/cybersemics/em/issues/3681
  it('a swipe right from the left edge of the screen does not navigate back while the sidebar is open', async () => {
    // Safari only offers swipe-back when there is a page to go back to, so open another page before em.
    const appUrl = await browser.getUrl()
    await browser.url(new URL('/favicon-32x32.png', appUrl).href)
    await browser.url(appUrl)
    await resetApp()

    await newThought('hello')
    await tapToolbar('Add to Favorites')
    await tap(await waitForElement('[aria-label="menu"]'))
    await waitForElement('[data-testid="sidebar"]:not([inert])')
    const urlBeforeSwipe = await browser.getUrl()

    await swipeFromLeftEdge()
    expect(await browser.getUrl()).toBe(urlBeforeSwipe)

    // Close the sidebar by tapping the backdrop. This can only succeed if em is still the page on screen, so it rules
    // out a swipe-back that was still animating when the URL above was read.
    await tap(await waitForElement('[data-testid="sidebar"]'), { horizontalTapLine: 'right', x: -10 })
    await waitForElement('[data-testid="sidebar"][inert]')

    expect(await browser.getUrl()).toBe(urlBeforeSwipe)
  })
})
