/**
 * @jest-environment ./src/e2e/puppeteer-environment.js
 */

import clickBullet from '../../test-helpers/e2e-helpers/clickBullet'
import importTextFirstMatch from '../../test-helpers/e2e-helpers/importTextFirstMatch'
import setCursorAndSelection from '../../test-helpers/e2e-helpers/setCursorAndSelection'
import { hashContext } from '../../util'

beforeEach(async () => {
  await page.click('#skip-tutorial')
})

afterEach(async () => {
  await page.evaluate(async () => {
    const testHelpers = (window.em as any).testHelpers
    await testHelpers.clearAll()
    await localStorage.clear()
  })

  await page.reload({
    waitUntil: 'load'
  })
})

describe('caret testing', () => {
  it('caret should be at the beginning of thought after split on enter', async () => {

    await page.keyboard.press('Enter')

    const importText = `
    - puppeteer
      - web scrapping
    - insomnia
      - rest api`

    await importTextFirstMatch(page, [''], importText)

    await setCursorAndSelection(page, {
      unrankedPath: ['puppeteer', 'web scrapping'],
      offset: 3
    })

    await page.keyboard.press('Enter')

    const offset = await page.evaluate(() => window.getSelection()?.focusOffset)

    expect(offset).toBe(0)
  })

  it('clicking a bullet, the caret should move to the beginning of the thought', async () => {

    await page.keyboard.press('Enter')

    const importText = `
    - Don't stay awake for too long
      - I don't wanna fall asleep`

    await importTextFirstMatch(page, [''], importText)

    await setCursorAndSelection(page, {
      unrankedPath: ['Don\'t stay awake for too long', 'I don\'t wanna fall asleep'],
      offset: 10
    })

    const hashedContext = hashContext(['Don\'t stay awake for too long'], 0)

    await clickBullet(page, hashedContext)

    const offset = await page.evaluate(() => window.getSelection()?.focusOffset)

    expect(offset).toBe(0)
  })
})
