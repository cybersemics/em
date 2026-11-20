import click from '../helpers/click'
import clickThought from '../helpers/clickThought'
import command from '../helpers/command'
import getEditable from '../helpers/getEditable'
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

/** Enough thoughts that a change of the font size moves the last of them, and the footer below it, by more than the height of a font size button. */
const thoughts = Array.from({ length: 20 }, (_, i) => `- t${i + 1}`).join('\n')

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

// https://github.com/cybersemics/em/issues/6273
it('changing the font size holds the cursor where it is on the screen, so that the footer below it stays out of view', async () => {
  await paste(thoughts)
  await clickThought('t20')
  // scroll down until the footer is just below the viewport, which also supersedes the scroll that setting the cursor queued
  const footerTop = await page.$eval('[aria-label=footer]', footer => footer.getBoundingClientRect().y)
  const viewportHeight = await page.evaluate(() => window.innerHeight)
  await scrollTo((await page.evaluate(() => window.scrollY)) + footerTop - viewportHeight)
  const cursorTop = await (await getEditable('t20')).evaluate(editable => editable.getBoundingClientRect().y)

  // every thought above the cursor gets shorter, which would move the cursor and the footer up the screen
  await command('fontSizeDown')
  await waitForAlert('Font size: 15')
  await waitForBrowserSettled()

  const cursorTopAfter = await (await getEditable('t20')).evaluate(editable => editable.getBoundingClientRect().y)
  expect(Math.abs(cursorTopAfter - cursorTop)).toBeLessThan(1)
  const footerTopAfter = await page.$eval('[aria-label=footer]', footer => footer.getBoundingClientRect().y)
  expect(footerTopAfter).toBeGreaterThanOrEqual(viewportHeight)
})

// https://github.com/cybersemics/em/issues/1152
it('the footer font size buttons stay under the pointer', async () => {
  await paste(thoughts)
  // clear the cursor, whose own scroll would take the page back to it, so that only the buttons move the page
  await press('Escape')
  await scrollTo(await page.evaluate(() => document.documentElement.scrollHeight))

  // the thoughts above the footer grow, which would move the button down from under the pointer, at its center
  const increase = await page.$eval('[data-testid=increase-font]', button => {
    const { x, y, width, height } = button.getBoundingClientRect()
    return { x: x + width / 2, y: y + height / 2 }
  })
  await click('[data-testid=increase-font]')
  await waitForAlert('Font size: 17')
  await waitForBrowserSettled()

  expect(
    await page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.getAttribute('data-testid'), increase),
  ).toBe('increase-font')

  // the center of the button, where the pointer clicks it
  const decrease = await page.$eval('[data-testid=decrease-font]', button => {
    const { x, y, width, height } = button.getBoundingClientRect()
    return { x: x + width / 2, y: y + height / 2 }
  })
  await click('[data-testid=decrease-font]')
  await waitForAlert('Font size: 16')
  await waitForBrowserSettled()

  expect(
    await page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.getAttribute('data-testid'), decrease),
  ).toBe('decrease-font')
})
