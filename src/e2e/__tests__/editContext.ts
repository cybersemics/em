/**
 * @jest-environment ./src/e2e/puppeteer-environment.js
 */

import paste from '../../test-helpers/e2e-helpers/paste'
import waitForEditable from '../../test-helpers/e2e-helpers/waitForEditable'
import clickThought from '../../test-helpers/e2e-helpers/clickThought'
import getEditable from '../../test-helpers/e2e-helpers/getEditable'
import initPage from '../../test-helpers/e2e-helpers/initPage'
import { JSHandle, Page } from 'puppeteer'

/** Gets the first subthought of an editable. */
const getFirstSubthought = (editable: JSHandle) =>
  editable.asElement()!.evaluateHandle(el =>
    el.parentElement?.parentElement?.nextElementSibling?.querySelector('.editable')
  )

describe('Context view: edit context testing', () => {
  let page: Page
  jest.setTimeout(10000)

  beforeEach(async () => {
    page = await initPage()
  })

  afterEach(async () => {
    await page.browserContext().close()
  })

  it.skip('edit context value', async () => {

    const importText = `
    - a
      - m
        - x
    - b
      - m`
    await paste(page, [''], importText)

    await waitForEditable(page, 'b')
    await clickThought(page, 'b')

    // click on b/m
    const editableB = (await getEditable(page, 'b')).asElement()
    const editableBM = await getFirstSubthought(editableB!)
    const editableBMTextContent = await editableBM.getProperty('textContent')
    expect(await editableBMTextContent?.jsonValue()).toBe('m')
    await editableBM.asElement()!.click()

    // toggle context view
    const toggleContextView = await page.$('#toggleContextView')
    await toggleContextView!.click()

    // click on b/m~/a
    const editableBMA = await getFirstSubthought(editableBM)
    const editableBMATextContent = await editableBMA.getProperty('textContent')
    expect(await editableBMATextContent?.jsonValue()).toBe('a')
    await editableBMA.asElement()!.click()

    // edit b/m~/a to "apple"
    await page.keyboard.press('ArrowRight')
    await page.keyboard.type('pple')

    // move to home
    await page.keyboard.press('Escape', { delay: 10 })
    await page.keyboard.press('Escape', { delay: 10 })
    await page.keyboard.press('Escape', { delay: 10 })

    // assert that "a" in the root has changed to "apple"
    const editableApple = (await getEditable(page, 'apple')).asElement()
    expect(editableApple).toBeTruthy()

  })
})
