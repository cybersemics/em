/**
 * @jest-environment ./src/e2e/puppeteer-environment.js
 */
import clickBullet from '../helpers/clickBullet'
import clickWithOffset from '../helpers/clickWithOffset'
import paste from '../helpers/paste'
import waitForEditable from '../helpers/waitForEditable'
import waitForState from '../helpers/waitForState'
import { devices, Page } from 'puppeteer'
import initPage from '../helpers/initPage'
import clickThought from '../helpers/clickThought'
import waitForThoughtToExistInDb from '../helpers/waitForThoughtExistInDb'
import waitForElementBecomeHidden from '../helpers/waitForElementBecomeHidden'

describe('caret testing', () => {
  let page: Page

  beforeEach(async () => {
    page = await initPage()
  })

  afterEach(async () => {
    await page.browserContext().close()
  })

  it('caret should be at the beginning of thought after split on enter', async () => {

    const importText = `
    - puppeteer
      - web scrapping
    - insomnia
      - rest api`
    await page.keyboard.press('Enter')
    await paste(page, [''], importText)

    await waitForEditable(page, 'puppeteer')
    await clickThought(page, 'puppeteer')

    await waitForEditable(page, 'web scrapping')
    await clickThought(page, 'web scrapping')

    const editableNodeHandle = await waitForEditable(page, 'web scrapping')
    await clickWithOffset(page, editableNodeHandle, { offset: 3 })

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

    const editableNodeHandle = await waitForEditable(page, 'I don\'t wanna fall asleep')
    await clickWithOffset(page, editableNodeHandle, { offset: 10 })

    await clickBullet(page, 'Don\'t stay awake for too long')
    const offset = await page.evaluate(() => window.getSelection()?.focusOffset)
    expect(offset).toBe(0)
  })

  it('clicking on the left edge of a thought, the caret should move to the beginning of the thought.', async () => {

    const importText = `
    - Purple Rain`

    await page.keyboard.press('Enter')
    await paste(page, [''], importText)

    const editableNodeHandle = await waitForEditable(page, 'Purple Rain')

    await clickWithOffset(page, editableNodeHandle, { offset: 5 })
    await page.waitForFunction(() => window.getSelection()?.focusOffset === 5)
    await clickWithOffset(page, editableNodeHandle, { horizontalClickLine: 'left' })

    const offset = await page.evaluate(() => window.getSelection()?.focusOffset)
    expect(offset).toBe(0)
  })

  it('clicking to the left of a thought, the caret should move to the beginning of the thought.', async () => {

    const importText = `
    - Purple Rain`

    await page.keyboard.press('Enter')
    await paste(page, [''], importText)

    const editableNodeHandle = await waitForEditable(page, 'Purple Rain')

    await clickWithOffset(page, editableNodeHandle, { offset: 5 })
    await page.waitForFunction(() => window.getSelection()?.focusOffset === 5)
    await clickWithOffset(page, editableNodeHandle, { horizontalClickLine: 'left', x: -50 })

    const offset = await page.evaluate(() => window.getSelection()?.focusOffset)
    expect(offset).toBe(0)
  })

  it('clicking on the right edge of a thought, the caret should move to the end of the thought.', async () => {

    const importText = `
    - Richard Feynman`

    await page.keyboard.press('Enter')
    await paste(page, [''], importText)

    const editableNodeHandle = await waitForEditable(page, 'Richard Feynman')

    await clickWithOffset(page, editableNodeHandle, { horizontalClickLine: 'left' })
    await page.waitForFunction(() => window.getSelection()?.focusOffset === 0)
    await clickWithOffset(page, editableNodeHandle, { horizontalClickLine: 'right' })

    const offset = await page.evaluate(() => window.getSelection()?.focusOffset)
    expect(offset).toBe('Richard Feynman'.length)
  })

  it.skip('clicking to the right of a thought, the caret should...?', async () => {

    // const importText = `
    // - Richard Feynman`

    // await page.keyboard.press('Enter')
    // await paste(page, [''], importText)
    // await setCursor(page, ['Richard Feynman'], { offset: 0 })
    // const editableNodeHandle = await getEditable(page, 'Richard Feynman')
    // await clickWithOffset(page, editableNodeHandle, { horizontalClickLine: 'right', x: 50 })

    // const offset = await page.evaluate(() => window.getSelection()?.focusOffset)
    // expect(offset).toBe('Richard Feynman'.length)
  })

  it('clicking in the middle of a thought, the caret should be set to the point that is clicked.', async () => {

    const importText = `
    - Freddie Mercury`

    await page.keyboard.press('Enter')
    await paste(page, [''], importText)

    const editableNodeHandle = await waitForEditable(page, 'Freddie Mercury')

    // click on the given offset node of the editable using mouse click
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

    const editableNodeHandle = await waitForEditable(page, 'Husky')
    await clickWithOffset(page, editableNodeHandle, { horizontalClickLine: 'left' })

    await page.keyboard.press('ArrowDown')

    // the focus must be in Dogs/Labrador after cursor down
    const textContext = await page.evaluate(() => window.getSelection()?.focusNode?.textContent)
    expect(textContext).toBe('Labrador')

    const offset = await page.evaluate(() => window.getSelection()?.focusOffset)
    expect(offset).toBe(0)
  })

  it('when cursor is null, clicking on a thought after refreshing page, caret should be set on first click', async () => {
    const importText = `
    - a
    - b`

    await page.keyboard.press('Enter')
    await paste(page, [''], importText)

    await clickThought(page, 'a')

    // Set cursor to null
    await page.click('#content')

    await waitForState(page, 'isPushing', false)
    await waitForThoughtToExistInDb(page, 'a')
    await waitForThoughtToExistInDb(page, 'b')

    await page.evaluate(() => window.location.reload())

    await waitForEditable(page, 'b')
    await clickThought(page, 'b')

    const textContext = await page.evaluate(() => window.getSelection()?.focusNode?.textContent)
    expect(textContext).toBe('b')
  })

})

describe('caret testing for mobile platform', () => {
  let page: Page

  beforeEach(async () => {
    page = await initPage({ emulatedDevice: devices['iPhone 11'] })
  })

  afterEach(async () => {
    await page.browserContext().close()
  })

  it('when subCategorizeOne, caret should be on new thought', async () => {
    const importText = `
    - A
      - B`

    await page.keyboard.press('Enter')
    await paste(page, [''], importText)

    const editableNodeHandle = await waitForEditable(page, 'B')
    await clickWithOffset(page, editableNodeHandle, { horizontalClickLine: 'left' })

    // to close keyboard
    await clickBullet(page, 'B')

    await page.click('#subcategorizeOne')

    await waitForState(page, 'editing', true)

    const textContext = await page.evaluate(() => window.getSelection()?.focusNode?.textContent)
    expect(textContext).toBe('')

    const offset = await page.evaluate(() => window.getSelection()?.focusOffset)
    expect(offset).toBe(0)

  })

  it('on clicking the hidden thought, caret should be on the parent thought of editing thought', async () => {
    const importText = `
    - A
      - B
        -C
    - D`

    await page.keyboard.press('Enter')
    await paste(page, [''], importText)

    await clickThought(page, 'A')
    await clickThought(page, 'C')
    await waitForElementBecomeHidden(page, 'D')
    await clickThought(page, 'D')

    const textContext = await page.evaluate(() => window.getSelection()?.focusNode?.textContent)
    expect(textContext).toBe('B')
  })
})
