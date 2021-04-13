/**
 * @jest-environment ./src/e2e/puppeteer-environment.js
 */

import { delay } from '../../test-helpers/delay'
import clickBullet from '../../test-helpers/e2e-helpers/clickBullet'
import clickWithOffset from '../../test-helpers/e2e-helpers/clickWithOffset'
import getEditable from '../../test-helpers/e2e-helpers/getEditable'
import paste from '../../test-helpers/e2e-helpers/paste'
import setCursor from '../../test-helpers/e2e-helpers/setCursor'

beforeEach(async () => {
  await page.click('#skip-tutorial')
})

afterEach(async () => {
  await page.evaluate(async () => {
    const testHelpers = (window.em as any).testHelpers
    await testHelpers.clearAll()
    localStorage.clear()
  })

  await page.reload({
    waitUntil: 'load'
  })

  // Note: Callback attached to the page to dismiss alerts doesn't seem to work propely unless small delay is added after page reload.
  await delay(50)
})

describe('caret testing', () => {
  it('caret should be at the beginning of thought after split on enter', async () => {

    const importText = `
    - puppeteer
      - web scrapping
    - insomnia
      - rest api`

    await page.keyboard.press('Enter')
    await paste(page, [''], importText)
    await setCursor(page, ['puppeteer', 'web scrapping'], { offset: 3 })
    await page.keyboard.press('Enter')

    const offset = await page.evaluate(() => window.getSelection()?.focusOffset)
    expect(offset).toBe(0)
  })

  it('clicking a bullet, the caret should move to the beginning of the thought', async () => {

    const importText = `
    - Don't stay awake for too long
      - I don't wanna fall asleep`

    await page.keyboard.press('Enter')
    await paste(page, [''], importText)
    await setCursor(page, ['Don\'t stay awake for too long', 'I don\'t wanna fall asleep'], { offset: 10 })
    await clickBullet(page, 'Don\'t stay awake for too long')

    const offset = await page.evaluate(() => window.getSelection()?.focusOffset)
    expect(offset).toBe(0)
  })

  it('clicking to the left of a thought, the caret should move to the beginning of the thought.', async () => {

    const importText = `
    - Purple Rain`

    await page.keyboard.press('Enter')
    await paste(page, [''], importText)
    await setCursor(page, ['Purple Rain'], { offset: 5 })
    const editableNodeHandle = await getEditable(page, 'Purple Rain')
    await clickWithOffset(page, editableNodeHandle, { horizontalClickLine: 'left' })

    const offset = await page.evaluate(() => window.getSelection()?.focusOffset)
    expect(offset).toBe(0)
  })

  it('clicking to the right of a thought, the caret should move to the end of the thought.', async () => {

    const importText = `
    - Richard Feynman`

    await page.keyboard.press('Enter')
    await paste(page, [''], importText)
    await setCursor(page, ['Richard Feynman'], { offset: 0 })
    const editableNodeHandle = await getEditable(page, 'Richard Feynman')
    await clickWithOffset(page, editableNodeHandle, { horizontalClickLine: 'right' })

    const offset = await page.evaluate(() => window.getSelection()?.focusOffset)
    expect(offset).toBe('Richard Feynman'.length)
  })

  it('clicking in the middle of a thought, the caret should be set to the point that is clicked.', async () => {

    const importText = `
    - Freddie Mercury`

    await page.keyboard.press('Enter')
    await paste(page, [''], importText)
    await setCursor(page, ['Freddie Mercury'], { offset: 0 })

    // click on the given offset node of the editable using mouse click
    const editableNodeHandle = await getEditable(page, 'Freddie Mercury')
    await clickWithOffset(page, editableNodeHandle, { offset: 7 })

    const offset = await page.evaluate(() => window.getSelection()?.focusOffset)
    expect(offset).toBe(7)
  })

  it('on cursorDown, the caret should move to the beginning of the new cursor.', async () => {

    const importText = `
    - Dogs
      - Husky
      - Labrador
      - Golden Retriever`

    await page.keyboard.press('Enter')
    await paste(page, [''], importText)
    await setCursor(page, ['Dogs', 'Husky'], { offset: 0 })
    await page.keyboard.press('ArrowDown')

    // the focus must be in Dogs/Labrador after cursor down
    const textContext = await page.evaluate(() => window.getSelection()?.focusNode?.textContent)
    expect(textContext).toBe('Labrador')

    const offset = await page.evaluate(() => window.getSelection()?.focusOffset)
    expect(offset).toBe(0)
  })
})
