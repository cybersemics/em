import { KnownDevices } from 'puppeteer'
import clickThought from '../helpers/clickThought'
import deviceEmulation from '../helpers/deviceEmulation'
import exportThoughts from '../helpers/exportThoughts'
import { startGesture } from '../helpers/gesture'
import paste from '../helpers/paste'
import waitForSelector from '../helpers/waitForSelector'
import { page } from '../session'

vi.setConfig({ testTimeout: 20000, hookTimeout: 20000 })

deviceEmulation.useForSuite(KnownDevices['iPhone 15 Pro'])

describe('command discovery', () => {
  it('holding still on an undiscovered command in the Gesture Menu discovers it while the finger is down', async () => {
    await paste('Hello')
    await clickThought('Hello')

    // New Subthought (above) is undiscovered on a fresh profile, so the Gesture Menu shows it as the ghost.
    const touch = await startGesture({ yStart: 150 })
    await touch.move('rdu')

    // The finger stays down and still: the ghost charges and Command Discovery opens before it lifts.
    await waitForSelector('[role=dialog][aria-label="Discovered New Subthought (above)"]')
    await touch.end()

    // The release after the discovery performs nothing: Hello has no new subthought.
    expect(await exportThoughts()).toBe('\n- Hello\n')
  })

  it('dragging the discovered command into the pinned command ring pins it and closes Command Discovery', async () => {
    await paste('Hello')
    await clickThought('Hello')
    const touch = await startGesture({ yStart: 150 })
    await touch.move('rdu')
    await waitForSelector('[role=dialog][aria-label="Discovered New Subthought (above)"]')
    await touch.end()
    // Let the command come to rest.
    await new Promise(resolve => setTimeout(resolve, 1200))

    const name = await page.evaluate(() => {
      const label = [...document.querySelectorAll('[role=dialog] div')].find(
        element => element.textContent === 'New Subthought (above)' && element.children.length === 0,
      )
      const rect = label!.getBoundingClientRect()
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
    })
    const ring = await page.evaluate(() => ({ x: window.innerWidth - 36, y: window.innerHeight - 50 }))

    // A long press picks the command up, and the drag carries it into the ring.
    await page.touchscreen.touchStart(name.x, name.y)
    await new Promise(resolve => setTimeout(resolve, 700))
    for (let step = 1; step <= 20; step++) {
      await page.touchscreen.touchMove(
        name.x + ((ring.x - name.x) * step) / 20,
        name.y + ((ring.y - name.y) * step) / 20,
      )
    }
    await page.touchscreen.touchEnd()

    await page.waitForSelector('[role=dialog][aria-label="Discovered New Subthought (above)"]', { hidden: true })
    await waitForSelector('[aria-label="Show gesture for New Subthought (above)"]')
  })

  it('tapping the command once the discovery has finished opens it in the Command Universe and closes Command Discovery', async () => {
    await paste('Hello')
    await clickThought('Hello')
    const touch = await startGesture({ yStart: 150 })
    await touch.move('rdu')
    await waitForSelector('[role=dialog][aria-label="Discovered New Subthought (above)"]')
    await touch.end()

    // The name becomes a button once the discovery has finished playing.
    const name = await page.waitForSelector('[aria-label="Open New Subthought (above) in the Command Universe"]', {
      timeout: 15000,
    })
    await name!.tap()

    await page.waitForSelector('[role=dialog][aria-label="Discovered New Subthought (above)"]', { hidden: true })
    await waitForSelector('[aria-label="Pin Command"]')
  })
})
