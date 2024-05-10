import { JSHandle } from 'puppeteer'
import helpers from '../helpers'

/** Gets the first subthought of an editable. */
const getFirstSubthought = (editable: JSHandle) =>
  editable
    .asElement()!
    .evaluateHandle(el => el.parentElement?.parentElement?.nextElementSibling?.querySelector('.editable'))

vi.setConfig({ testTimeout: 20000 })

const { $, clickThought, getEditable, paste, press, type } = helpers()

// TODO getFirstSubthought no longer works after flat rendering of thoughts via LayoutTree
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
  const toggleContextView = await $('[aria-label="Context View"]')
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
