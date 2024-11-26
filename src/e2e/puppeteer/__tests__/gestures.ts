import { KnownDevices } from 'puppeteer'
import { drawHorizontalLineGesture } from '../helpers/gesture'
import paste from '../helpers/paste'
import waitForEditable from '../helpers/waitForEditable'
import { page } from '../setup'

vi.setConfig({ testTimeout: 20000, hookTimeout: 20000 })
const iPhone = KnownDevices['iPhone 15 Pro']

describe('gestures', () => {
  it('when starting a gesture, the command palette will open', async () => {
    const cursor = 'Hello'
    const importText = `
    - ${cursor}`

    await page.emulate(iPhone)
    await paste(importText)

    await drawHorizontalLineGesture()

    // the command palette should open
    const popupValue = await page.$('[data-testid=popup-value]')
    expect(popupValue).toBeTruthy()
  })
})
