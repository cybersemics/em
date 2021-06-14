/**
 * @jest-environment ./src/e2e/puppeteer-environment.js
 */

import paste from '../helpers/paste'
import getEditingText from '../helpers/getEditingText'
import waitForEditable from '../helpers/waitForEditable'
import waitForThoughtToExistInDb from '../helpers/waitForThoughtExistInDb'
import waitForState from '../helpers/waitForState'
import clickThought from '../helpers/clickThought'
import initPage from '../helpers/initPage'
import { Page } from 'puppeteer'

describe('cursor testing', () => {
  let page: Page
  jest.setTimeout(20000)

  beforeEach(async () => {
    page = await initPage()
  })

  afterEach(async () => {
    await page.browserContext().close()
  })

  it('cursor on a home thought', async () => {

    const importText = `
    - A
    - B`
    await paste(page, importText)
    await waitForEditable(page, 'B')
    await clickThought(page, 'B')

    await waitForState(page, 'isPushing', false)
    await waitForThoughtToExistInDb(page, 'B')
    await waitForThoughtToExistInDb(page, 'A')
    await page.evaluate(() => window.location.reload())

    await waitForEditable(page, 'B')
    const thoughtValue = await getEditingText(page)
    expect(thoughtValue).toBe('B')
  })

  it('cursor on a subthought', async () => {

    const importText = `
    - A
      - X
    - B
      - Y
      - Z`
    await paste(page, importText)
    await waitForEditable(page, 'B')
    await clickThought(page, 'B')
    await clickThought(page, 'Z')

    await waitForState(page, 'isPushing', false)
    await waitForThoughtToExistInDb(page, 'B')
    await waitForThoughtToExistInDb(page, 'Z')
    await waitForThoughtToExistInDb(page, 'A')

    await page.evaluate(() => window.location.reload())

    await waitForEditable(page, 'Z')
    const thoughtValue = await getEditingText(page)
    expect(thoughtValue).toBe('Z')
  })
})
