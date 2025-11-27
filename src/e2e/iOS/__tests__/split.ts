import helpers from '../helpers'

const { clickThought, getEditingText, getSelection, paste, pause, tapReturnKey, tap, waitForEditable } = helpers()

it.skip('split a thought when the caret is in the middle', async () => {
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
  await tap(editableNodeHandle, { y: 60, x: 25 })
  await tap(editableNodeHandle, { y: 60, x: 25 })
  await pause(5000)
  await tapReturnKey()

  const offset = await getSelection()?.focusOffset
  expect(offset).toBe(0)

  const editingText = await getEditingText()
  expect(editingText).toBe('scraping')
})
