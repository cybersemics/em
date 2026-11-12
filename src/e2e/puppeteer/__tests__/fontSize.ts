import click from '../helpers/click'
import clickThought from '../helpers/clickThought'
import command from '../helpers/command'
import paste from '../helpers/paste'
import press from '../helpers/press'
import scrollTo from '../helpers/scrollTo'
import waitForAlert from '../helpers/waitForAlert'
import waitForBrowserSettled from '../helpers/waitForBrowserSettled'
import { page } from '../session'

/** Records every scroll position the page moves to from now on, and returns a function that reads them. */
const recordScrollPositions = async () => {
  await page.evaluate(() => {
    const positions: number[] = []
    window.addEventListener('scroll', () => positions.push(window.scrollY))
    ;(window as unknown as { scrollPositions: number[] }).scrollPositions = positions
  })
  return () => page.evaluate(() => (window as unknown as { scrollPositions: number[] }).scrollPositions)
}

/** The distance in px between the bottom of the viewport and the bottom of the page. */
const distanceFromBottom = () =>
  page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight - window.scrollY)

// https://github.com/cybersemics/em/issues/6273
it('changing the font size leaves the scroll position alone', async () => {
  await paste(`
    - a
  `)
  await clickThought('a')
  // supersede the scroll that setting the cursor queued, so that it cannot land while the scroll is recorded
  await scrollTo(0)

  const scrollPositions = await recordScrollPositions()
  await command('fontSizeUp')
  // the alert is shown by the effect that would scroll, so once it is visible and a frame has passed, so has the scroll
  await waitForAlert('Font size: 17')
  await waitForBrowserSettled()

  expect(await scrollPositions()).toEqual([])
})

// https://github.com/cybersemics/em/issues/1152
it('the footer font size buttons keep the page scrolled to the bottom, so that they stay under the pointer', async () => {
  await paste(`
    - a
    - b
  `)
  // clear the cursor, whose own scroll would take the page back to it, so that only the button moves the page
  await press('Escape')
  await scrollTo(await page.evaluate(() => document.documentElement.scrollHeight))

  // the thoughts above the footer grow, so the page would no longer be at the bottom unless the button scrolls
  await click('[data-testid=increase-font]')
  await waitForAlert('Font size: 17')
  await waitForBrowserSettled()

  expect(await distanceFromBottom()).toBeLessThan(1)
})
