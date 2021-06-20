/**
 * @jest-environment ./src/e2e/webdriverio-environment.js
 */

import helpers from '../helpers'

jest.setTimeout(90000)

const {
  $,
  clickThought,
  paste,
  waitForEditable,
} = helpers()

it('click home link to set the cursor to null', async () => {

  const text = `
  - a
    - b`
  await paste(text)
  await waitForEditable('b')
  await clickThought('b') // set cursor
  await clickThought('b') // open keyboard

  const editingBefore = await $('.editing')
  expect(editingBefore.elementId).toBeTruthy()

  const homeLink = await $('.home a')
  expect(homeLink).toBeTruthy()
  await homeLink.click()

  const editingAfter = await $('.editing')
  expect(editingAfter.elementId).toBeFalsy()

})
