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

  it('when starting a gesture near the selection, the gesture will be abandoned', async () => {
    const cursor = 'Hello'
    const importText = `
    - ${cursor}`

    await page.emulate(iPhone)
    await paste(importText)

    const editableNodeHandle = await waitForEditable('Hello')
    const rect = await page.evaluate(element => {
      const rect = element!.getBoundingClientRect()
      return { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom }
    }, editableNodeHandle)

    await page.touchscreen.tap(rect.left + 10, rect.top + 10)
    await page.touchscreen.tap(rect.left + 10, rect.top + 10)
    await drawHorizontalLineGesture(rect.top)

    // the command palette should not open
    const popupValue = await page.$('[data-testid=popup-value]')
    expect(popupValue).toBeFalsy()
  })

  it('when starting a gesture far from the selection, the command palette will open', async () => {
    const cursor = 'Hello'
    const importText = `
    - ${cursor}`

    await page.emulate(iPhone)
    await paste(importText)

    const editableNodeHandle = await waitForEditable('Hello')
    const rect = await page.evaluate(element => {
      const rect = element!.getBoundingClientRect()
      return { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom }
    }, editableNodeHandle)

    await page.touchscreen.tap(rect.left + 10, rect.top + 10)
    await page.touchscreen.tap(rect.left + 10, rect.top + 10)
    await drawHorizontalLineGesture(rect.bottom + 110)

    // the command palette should open
    const popupValue = await page.$('[data-testid=popup-value]')
    expect(popupValue).toBeTruthy()
  })
})
