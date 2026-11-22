import { KnownDevices } from 'puppeteer'
import clickThought from '../helpers/clickThought'
import closeKeyboard from '../helpers/closeKeyboard'
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

describe('Android scroll momentum', () => {
  deviceEmulation.useForSuite(KnownDevices['Pixel 5'])

  // https://github.com/cybersemics/em/pull/5400
  it('stops at the visible boundary without repeatedly overshooting after a flick', async () => {
    await paste(`
      - A
      - B
      - C
      - D
      - E
      - F
      - G
      - H
      - I
      - J
      - K
      - L
      - M
      - N
      - O
      - P
      - Q
      - R
      - S
      - T
      - U
      - V
        - W
          - X
            - Y
              - Z
    `)
    await clickThought('V')
    await clickThought('W')
    await clickThought('X')
    await clickThought('Y')
    await clickThought('Z')
    await closeKeyboard()
    await waitForBrowserSettled()
    const { minScrollY, maxScrollY } = await getVisibleThoughtBounds()
    expect(minScrollY).toBeGreaterThan(50)
    await scrollTo(maxScrollY)
    await waitForBrowserSettled()

    // Capture before the scroll correction, since animation-frame reads see only the corrected position.
    const motion = await page.evaluateHandle(() => {
      const positions: number[] = []
      /** Records the visible native position before the clamp can replace it. */
      const onScroll = () => positions.push(window.scrollY)
      window.addEventListener('scroll', onScroll, { capture: true })
      return { positions, onScroll }
    })
    try {
      const swipe = await startGesture({ xStart: 350, yStart: 100 })
      await swipe.move('d', { segmentLength: 430, stepSize: 60 })
      await swipe.end()
      await page.waitForFunction(min => Math.abs(window.scrollY - min) < 1, {}, minScrollY)
      await page.evaluate(async () => {
        for (let frame = 0; frame < 8; frame++) await new Promise(requestAnimationFrame)
      })
      const positions = await page.evaluate(motion => motion.positions, motion)
      expect(positions.filter(y => y < minScrollY - 1).length).toBeLessThanOrEqual(1)
      expect(Math.abs((await page.evaluate(() => window.scrollY)) - minScrollY)).toBeLessThan(1)

      const nextSwipe = await startGesture({ xStart: 350, yStart: 500 })
      await nextSwipe.move('u', { segmentLength: 100 })
      await page.waitForFunction(min => window.scrollY > min + 50, {}, minScrollY)
      await nextSwipe.end()
    } finally {
      await page.evaluate(motion => window.removeEventListener('scroll', motion.onScroll, true), motion)
      await motion.dispose()
    }
  })
})
