import { KnownDevices } from 'puppeteer'
import clickThought from '../helpers/clickThought'
import deviceEmulation from '../helpers/deviceEmulation'
import { startGesture } from '../helpers/gesture'
import getThoughtTop from '../helpers/getThoughtTop'
import getVisibleThoughtBounds from '../helpers/getVisibleThoughtBounds'
import paste from '../helpers/paste'
import press from '../helpers/press'
import scrollTo from '../helpers/scrollTo'
import waitForBrowserSettled from '../helpers/waitForBrowserSettled'
import waitForCursor from '../helpers/waitForCursor'
import { page } from '../session'

describe.each([
  { platform: 'Android', device: KnownDevices['Pixel 5'] },
  {
    platform: 'desktop with touch',
    device: {
      ...KnownDevices['Pixel 5'],
      userAgent:
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      viewport: { ...KnownDevices['Pixel 5'].viewport, isMobile: false },
    },
  },
])('$platform scroll bounds', ({ device }) => {
  deviceEmulation.useForSuite(device)

  it('stops at the visible boundary without rubber-banding during a held touch', async () => {
    await paste(`
      - a
      - b
      - c
      - d
      - e
      - f
      - g
      - h
      - i
      - j
      - k
      - l
      - m
        - n
        - o
        - p
        - q
        - r
        - s
        - t
        - u
        - v
        - w
        - x
        - y
        - z
          - 1
            - 2
              - 3
    `)

    await clickThought('m')
    await scrollTo(200)
    await clickThought('z')
    await waitForCursor('z')
    await press('ArrowDown')
    await waitForCursor('1')
    await press('ArrowDown')
    await waitForCursor('2')
    await press('ArrowDown')
    await waitForCursor('3')
    await waitForBrowserSettled()
    const { minScrollY } = await getVisibleThoughtBounds()
    await scrollTo(minScrollY)
    await waitForBrowserSettled()

    const topAtBoundary = await getThoughtTop('1')
    const gesture = await startGesture({ xStart: 350, yStart: 100 })
    await gesture.move('d', { segmentLength: 200 })
    await waitForBrowserSettled()
    expect(await page.evaluate(() => window.scrollY)).toBeGreaterThanOrEqual(minScrollY - 1)
    expect(Math.abs((await getThoughtTop('1')) - topAtBoundary)).toBeLessThan(1)
    await gesture.end()
    await waitForBrowserSettled()
    expect(Math.abs((await getThoughtTop('1')) - topAtBoundary)).toBeLessThan(1)
  })
})
