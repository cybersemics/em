/**
 * @jest-environment ./src/e2e/puppeteer-environment.js
 */

import paste from '../../test-helpers/e2e-helpers/paste'
import getEditingText from '../../test-helpers/e2e-helpers/getEditingText'
import waitForEditable from '../../test-helpers/e2e-helpers/waitForEditable'
import waitForThoughtToExistInDb from '../../test-helpers/e2e-helpers/waitForThoughtExistInDb'
import waitForState from '../../test-helpers/e2e-helpers/waitForState'
import clickThought from '../../test-helpers/e2e-helpers/clickThought'
import waitForContextHasChildWithValue from '../../test-helpers/e2e-helpers/waitForContextHasChildWithValue'
import emulatedDevices from '../emulated-devices'

beforeEach(async () => {
  await page.waitForSelector('#skip-tutorial')
  await waitForContextHasChildWithValue(page, ['__EM__', 'Settings', 'Tutorial'], 'On')
  await page.click('#skip-tutorial')
  await page.waitForFunction(() => !document.getElementById('skip-tutorial'))
})

afterEach(async () => {

  await page.evaluate(async () => {
    const testHelpers = (window.em as any).testHelpers
    await testHelpers.clearAll()
    localStorage.clear()
  })

  await page.waitForFunction(() => localStorage.length === 0)
  await page.goto('http://localhost:3000/', { waitUntil: 'load' })
})

describe.each(emulatedDevices)('cursor testing for all platform', device => {
  beforeAll(async () => {
    await page.emulate(device)
  })

  describe(device.name, () => {
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

})
