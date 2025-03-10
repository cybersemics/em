/**
 * @jest-environment ./src/e2e/webdriverio-environment.js
 */
import helpers from '../helpers'

const { $, clickThought, paste, tap, waitForEditable } = helpers()

// test succeeds individually, but fails when there are too many tests running in parallel
// https://github.com/cybersemics/em/issues/1475
// https://github.com/cybersemics/em/issues/1523

// broken
it('click home link to set the cursor to null', async () => {
  const text = `
  - a
    - b`
  await paste(text)
  await waitForEditable('b')
  await clickThought('b') // set cursor
  // await clickThought('b') // open keyboard - DOES NOT WORK

  const editableNodeHandle = await waitForEditable('b')
  // await tap(editableNodeHandle, { offset: 1 })
  await tap(editableNodeHandle, { x: 25 })

  const editingBefore = await $('[data-editing=true]')
  expect(editingBefore.elementId).toBeTruthy()

  const homeLink = await $('[data-testid=home] a')
  expect(homeLink).toBeTruthy()
  await homeLink.click()

  const editingAfter = await $('[data-editing=true]')
  expect(editingAfter.elementId).toBeFalsy()
})
