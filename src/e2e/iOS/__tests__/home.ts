/**
 * @jest-environment ./src/e2e/webdriverio-environment.js
 */

import { Browser } from 'webdriverio'
import paste from '../helpers/paste'
import waitForEditable from '../helpers/waitForEditable'
import clickThought from '../helpers/clickThought'
import initSession from '../helpers/initSession'

jest.setTimeout(90000)
const mobileBrowser = browser as unknown as Browser<'async'>

beforeEach(initSession())

it('click home link to set the cursor to null', async () => {

  const text = `
  - a
    - b`
  await paste(mobileBrowser, text)
  await waitForEditable(mobileBrowser, 'b')
  await clickThought(mobileBrowser, 'b') // set cursor
  await clickThought(mobileBrowser, 'b') // open keyboard

  const editingBefore = await mobileBrowser.$('.editing')
  expect(editingBefore.elementId).toBeTruthy()

  const homeLink = await mobileBrowser.$('.home a')
  expect(homeLink).toBeTruthy()
  await homeLink.click()

  const editingAfter = await mobileBrowser.$('.editing')
  expect(editingAfter.elementId).toBeFalsy()

})
