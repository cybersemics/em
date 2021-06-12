/**
 * @jest-environment ./src/e2e/webdriverio-environment.js
 */

import { Browser } from 'webdriverio'
import paste from '../../helpers/mobile/paste'
import waitForEditable from '../../helpers/mobile/waitForEditable'
import clickThought from '../../helpers/mobile/clickThought'
import gesture from '../../helpers/mobile/gesture'
import initSession from '../../helpers/mobile/initSession'
import { gestures } from '../../helpers/constants'

jest.setTimeout(90000)
const mobileBrowser = browser as unknown as Browser<'async'>

beforeEach(initSession())

it('click home link to set the cursor to null', async () => {

  const text = `
  - a
    - b`
  await gesture(mobileBrowser, gestures.newThought)
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
