import getPixels from '../helpers/getPixels'
import openModal from '../helpers/openModal'
import { page } from '../session'

// https://github.com/cybersemics/em/issues/6260
it('the Font Size field shows its step arrows without hovering', async () => {
  await openModal('settings')

  // the step arrows are drawn at the right end of the field's content box
  const { clip, background } = await page.$eval('input[type=number]', input => {
    const rect = input.getBoundingClientRect()
    const style = getComputedStyle(input)
    const right = rect.right - parseFloat(style.borderRightWidth) - parseFloat(style.paddingRight)
    const top = rect.top + parseFloat(style.borderTopWidth) + parseFloat(style.paddingTop)
    const bottom = rect.bottom - parseFloat(style.borderBottomWidth) - parseFloat(style.paddingBottom)
    const width = 16
    return {
      clip: { x: right - width, y: top, width, height: bottom - top },
      background: style.backgroundColor.match(/\d+/g)!.slice(0, 3).map(Number),
    }
  })
  const pixels = await getPixels(clip)

  const drawn = pixels.filter(pixel => pixel.some((channel, i) => Math.abs(channel - background[i]) > 32))
  expect(drawn.length).toBeGreaterThan(0)
})
