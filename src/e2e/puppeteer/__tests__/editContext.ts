/**
 * @jest-environment ./src/e2e/puppeteer-environment.js
 */

import helpers from '../helpers'
import initPage from '../helpers/initPage'
import { JSHandle, Page } from 'puppeteer'

/** Gets the first subthought of an editable. */
const getFirstSubthought = (editable: JSHandle) =>
  editable.asElement()!.evaluateHandle(el =>
    el.parentElement?.parentElement?.nextElementSibling?.querySelector('.editable')
  )

jest.setTimeout(20000)

const {
  $,
  clickThought,
  getEditable,
  paste,
  press,
  ref: pageRef,
  type,
} = helpers

beforeEach(async () => {
  pageRef.current = await initPage()
})

afterEach(async () => {
  await pageRef.current.browserContext().close()
})

it.skip('edit context value', async () => {

  const importText = `
  - a
    - m
      - x
  - b
    - m`
  await paste(importText)

  await clickThought('b')

  // click on b/m
  const editableB = (await getEditable('b')).asElement()
  const editableBM = await getFirstSubthought(editableB!)
  const editableBMTextContent = await editableBM.getProperty('textContent')
  expect(await editableBMTextContent?.jsonValue()).toBe('m')
  await editableBM.asElement()!.click()

  // toggle context view
  const toggleContextView = await $('#toggleContextView')
  await toggleContextView!.click()

  // click on b/m~/a
  const editableBMA = await getFirstSubthought(editableBM)
  const editableBMATextContent = await editableBMA.getProperty('textContent')
  expect(await editableBMATextContent?.jsonValue()).toBe('a')
  await editableBMA.asElement()!.click()

  // edit b/m~/a to "apple"
  await press('ArrowRight')
  await type('pple')

  // move to home
  await press('Escape', { delay: 10 })
  await press('Escape', { delay: 10 })
  await press('Escape', { delay: 10 })

  // assert that "a" in the root has changed to "apple"
  const editableApple = (await getEditable('apple')).asElement()
  expect(editableApple).toBeTruthy()

})
