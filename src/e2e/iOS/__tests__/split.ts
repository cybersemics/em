/**
 * IOS Safari thought splitting tests.
 * Uses WDIO test runner with Mocha framework.
 */
import clickThought from '../helpers/clickThought'
import getEditingText from '../helpers/getEditingText'
import getSelection from '../helpers/getSelection'
import paste from '../helpers/paste'
import tap from '../helpers/tap'
import tapReturnKey from '../helpers/tapReturnKey'
import waitForEditable from '../helpers/waitForEditable'

describe('Split', () => {
  it('split a thought when the caret is in the middle', async () => {
    const importText = `
  - puppeteer
    - web scraping
  - insomnia
    - rest api`

    await paste(importText)

    await waitForEditable('puppeteer')
    await clickThought('puppeteer')

    const editableNodeHandle = await waitForEditable('web scraping')
    await clickThought('web scraping')

    await tap(editableNodeHandle, { y: 60, x: 35 })
    await tap(editableNodeHandle, { y: 60, x: 35 })
    await tapReturnKey()

    const offset = await getSelection()?.focusOffset
    expect(offset).toBe(0)

    const editingText = await getEditingText()
    expect(editingText).toBe('scraping')
  })
})
