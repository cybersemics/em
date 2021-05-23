/**
 * @jest-environment ./src/e2e/webdriverio-environment.js
 */

import { Browser } from 'webdriverio'
import getEditingText from '../../../test-helpers/e2e-helpers/mobile/getEditingText'
import waitForElement from '../../../test-helpers/e2e-helpers/mobile/waitForElement'
import newThoughtGesture from '../../../test-helpers/e2e-helpers/mobile/gestures/newThoughtGesture'
import paste from '../../../test-helpers/e2e-helpers/mobile/paste'
import waitForEditable from '../../../test-helpers/e2e-helpers/mobile/waitForEditable'
import clickThought from '../../../test-helpers/e2e-helpers/mobile/clickThought'
import clickWithOffset from '../../../test-helpers/e2e-helpers/mobile/clickWithOffset'
import execute from '../../../test-helpers/e2e-helpers/mobile/execute'
import tapReturn from '../../../test-helpers/e2e-helpers/mobile/tapReturn'

jest.setTimeout(90000)
const mobileBrowser = browser as unknown as Browser<'async'>

describe('Caret Test', () => {

  beforeEach(async() => {
    await mobileBrowser.url('http://bs-local.com:3000')
    const skipElement = await waitForElement(mobileBrowser, '#skip-tutorial')
    await skipElement.click()
  })

  afterEach(async() => {
    await mobileBrowser.reloadSession()
  })

  it('#sample test 1', async () => {
    const importText = `
    - puppeteer
      - web scrapping
    - insomnia
      - rest api`
    await newThoughtGesture(mobileBrowser)
    await paste(mobileBrowser, [''], importText)

    await waitForEditable(mobileBrowser, 'puppeteer')
    await clickThought(mobileBrowser, 'puppeteer')

    await waitForEditable(mobileBrowser, 'web scrapping')
    await clickThought(mobileBrowser, 'web scrapping')

    const editableNodeHandle = await waitForEditable(mobileBrowser, 'web scrapping')
    await clickWithOffset(mobileBrowser, editableNodeHandle, { offset: 3 })

    await tapReturn(mobileBrowser)

    const offset = await execute(mobileBrowser, () => window.getSelection()?.focusOffset)
    expect(offset).toBe(0)

    const editingText = await getEditingText(mobileBrowser)
    expect(editingText).toBe('scrapping')
  })

})
