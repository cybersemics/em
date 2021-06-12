/**
 * @jest-environment ./src/e2e/webdriverio-environment.js
 */

import { Browser } from 'webdriverio'
import waitForElement from '../../helpers/mobile/waitForElement'
import paste from '../../helpers/mobile/paste'
import waitForEditable from '../../helpers/mobile/waitForEditable'
import clickThought from '../../helpers/mobile/clickThought'
import gesture from '../../helpers/mobile/gestures/gesture'
import { NEW_THOUGHT_GESTURE } from '../../helpers/constants'

jest.setTimeout(90000)
const mobileBrowser = browser as unknown as Browser<'async'>
let isFirstTest = true
describe('Home', () => {

  beforeEach(async() => {
    // Don't reload session for the first test. webdriverio already creates a session on init.
    if (!isFirstTest) {
      await mobileBrowser.reloadSession()
    }
    else {
      isFirstTest = false
    }

    await mobileBrowser.url('http://bs-local.com:3000')
    const skipElement = await waitForElement(mobileBrowser, '#skip-tutorial')
    await skipElement.click()
  })

  it('click home link to set the cursor to null', async () => {

    const text = `
    - a
      - b`
    await gesture(mobileBrowser, NEW_THOUGHT_GESTURE)
    await paste(mobileBrowser, [''], text)

    await waitForEditable(mobileBrowser, 'b')
    await clickThought(mobileBrowser, 'b')

    const editingBefore = await mobileBrowser.$('.editing')
    expect(editingBefore.elementId).toBeTruthy()

    const homeLink = await mobileBrowser.$('.home a')
    expect(homeLink).toBeTruthy()
    await homeLink.click()

    const editingAfter = await mobileBrowser.$('.editing')
    expect(editingAfter.elementId).toBeFalsy()

  })

})
