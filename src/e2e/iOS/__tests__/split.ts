/**
 * @jest-environment ./src/e2e/webdriverio-environment.js
 */
import helpers from '../helpers'

jest.setTimeout(90000)

const { clickThought, getEditingText, getSelection, paste, tapReturnKey, tap, waitForEditable } = helpers()

it('split a thought when the caret is in the middle', async () => {
  const importText = `
  - puppeteer
    - web scraping
  - insomnia
    - rest api`

  await paste(importText)

  await waitForEditable('puppeteer')
  await clickThought('puppeteer')

  await waitForEditable('web scraping')
  await clickThought('web scraping')

  const editableNodeHandle = await waitForEditable('web scraping')
  await tap(editableNodeHandle, { offset: 3 })

  await tapReturnKey()

  const offset = await getSelection()?.focusOffset
  expect(offset).toBe(0)

  const editingText = await getEditingText()
  expect(editingText).toBe('scraping')
})
