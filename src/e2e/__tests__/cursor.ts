/**
 * @jest-environment ./src/e2e/puppeteer-environment.js
 */

import paste from '../../test-helpers/e2e-helpers/paste'
import getEditingText from '../../test-helpers/e2e-helpers/getEditingText'
import waitForEditable from '../../test-helpers/e2e-helpers/waitForEditable'
import waitForThoughtToExistInDb from '../../test-helpers/e2e-helpers/waitForThoughtExistInDb'
import waitForState from '../../test-helpers/e2e-helpers/waitForState'
import clickThought from '../../test-helpers/e2e-helpers/clickThought'
import initPage from '../../test-helpers/e2e-helpers/initPage'
import { Page } from 'puppeteer'

describe('cursor testing', () => {
  let page: Page

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
    await paste(page, [''], importText)
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
    await paste(page, [''], importText)

    await waitForEditable(page, 'Z')
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
