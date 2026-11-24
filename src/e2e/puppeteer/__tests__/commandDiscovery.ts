import { KnownDevices } from 'puppeteer'
import clickThought from '../helpers/clickThought'
import deviceEmulation from '../helpers/deviceEmulation'
import exportThoughts from '../helpers/exportThoughts'
import { startGesture } from '../helpers/gesture'
import paste from '../helpers/paste'
import waitForSelector from '../helpers/waitForSelector'

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
})
