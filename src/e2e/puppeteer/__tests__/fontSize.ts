import click from '../helpers/click'
import clickThought from '../helpers/clickThought'
import command from '../helpers/command'
import paste from '../helpers/paste'
import waitForAlert from '../helpers/waitForAlert'
import { page } from '../session'

/** Starts recording each scroll position the page shows, frame by frame, for the given duration. */
const recordScrollPositions = (duration: number) =>
  page.evaluate(duration => {
    const positions: number[] = [window.scrollY]
    const start = performance.now()
    /** Records the scroll position of this frame, if it moved. */
    const sample = () => {
      if (window.scrollY !== positions.at(-1)) positions.push(window.scrollY)
      if (performance.now() - start < duration) requestAnimationFrame(sample)
    }
    requestAnimationFrame(sample)
    ;(window as unknown as { scrollPositions: number[] }).scrollPositions = positions
  }, duration)

// https://github.com/cybersemics/em/issues/6273
it('changing the font size leaves the scroll position alone', async () => {
  await paste(`
    - a
  `)
  await clickThought('a')
  const scrollY = await page.evaluate(() => window.scrollY)

  // long enough for a cursor scroll that the change schedules, which is throttled to 400 ms, to land
  await recordScrollPositions(1500)
  await command('fontSizeUp')
  await waitForAlert('Font size: 17')
  await new Promise(resolve => setTimeout(resolve, 1500))

  const scrollPositions = await page.evaluate(
    () => (window as unknown as { scrollPositions: number[] }).scrollPositions,
  )
  expect(scrollPositions).toEqual([scrollY])
})

// https://github.com/cybersemics/em/issues/1152
it('the footer font size buttons scroll to the bottom, so that they stay under the pointer', async () => {
  await paste(`
    - a
    - b
  `)
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))

  await click('[data-testid=increase-font]')
  await waitForAlert('Font size: 17')
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))

  const footerTop = await page.$eval('[aria-label="footer"]', el => el.getBoundingClientRect().top)
  expect(footerTop).toBeLessThan(await page.evaluate(() => window.innerHeight))
})
