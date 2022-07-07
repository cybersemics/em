/**
 * @jest-environment ./src/e2e/webdriverio-environment.js
 */
import helpers from '../helpers'

jest.setTimeout(90000)

const { $, clickThought, paste, waitForEditable } = helpers()

// test succeeds individually, but fails when there are too many tests running in parallel
// https://github.com/cybersemics/em/issues/1475
// https://github.com/cybersemics/em/issues/1523
it.skip('click home link to set the cursor to null', async () => {
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
