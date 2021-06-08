/**
 * @jest-environment ./src/e2e/webdriverio-environment.js
 */

import { Browser } from 'webdriverio'
import getEditingText from '../../helpers/mobile/getEditingText'
import waitForElement from '../../helpers/mobile/waitForElement'
import paste from '../../helpers/mobile/paste'
import waitForEditable from '../../helpers/mobile/waitForEditable'
import clickThought from '../../helpers/mobile/clickThought'
import clickWithOffset from '../../helpers/mobile/clickWithOffset'
// import execute from '../../../test-helpers/e2e-helpers/mobile/execute'
import tapReturnKey from '../../helpers/mobile/tapReturnKey'
import gesture from '../../helpers/mobile/gestures/gesture'
import { NEW_THOUGHT_GESTURE } from '../../helpers/constants'

jest.setTimeout(90000)
const mobileBrowser = browser as unknown as Browser<'async'>
let isFirstTest = true
describe('Sample Test', () => {

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

  it('#sample test 1', async () => {
    const importText = `
    - puppeteer
      - web scrapping
    - insomnia
      - rest api`

    await gesture(mobileBrowser, NEW_THOUGHT_GESTURE)
    await paste(mobileBrowser, [''], importText)

    await waitForEditable(mobileBrowser, 'puppeteer')
    await clickThought(mobileBrowser, 'puppeteer')

    await waitForEditable(mobileBrowser, 'web scrapping')
    await clickThought(mobileBrowser, 'web scrapping')

    const editableNodeHandle = await waitForEditable(mobileBrowser, 'web scrapping')
    await clickWithOffset(mobileBrowser, editableNodeHandle, { offset: 3 })

    await tapReturnKey(mobileBrowser)

    const offset = await mobileBrowser.execute(() => window.getSelection()?.focusOffset)
    expect(offset).toBe(0)

    const editingText = await getEditingText(mobileBrowser)
    expect(editingText).toBe('scrapping')
  })

})
