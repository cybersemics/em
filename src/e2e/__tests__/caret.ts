/**
 * @jest-environment ./src/e2e/puppeteer-environment.js
 */

import clickBullet from '../../test-helpers/e2e-helpers/clickBullet'
import clickWithOffset from '../../test-helpers/e2e-helpers/clickWithOffset'
import paste from '../../test-helpers/e2e-helpers/paste'
import waitForEditable from '../../test-helpers/e2e-helpers/waitForEditable'
import clickThought from '../../test-helpers/e2e-helpers/clickThought'
import waitForState from '../../test-helpers/e2e-helpers/waitForState'
import emulatedDevices, { iPhone, desktop } from '../emulated-devices'
import waitForContextHasChildWithValue from '../../test-helpers/e2e-helpers/waitForContextHasChildWithValue'

beforeEach(async () => {
  await page.waitForSelector('#skip-tutorial')
  await waitForContextHasChildWithValue(page, ['__EM__', 'Settings', 'Tutorial'], 'On')
  await page.click('#skip-tutorial')
  await page.waitForFunction(() => !document.getElementById('skip-tutorial'))

})

afterEach(async () => {
  await page.evaluate(async () => {
    const testHelpers = (window.em as any).testHelpers
    await testHelpers.clearAll()
    localStorage.clear()
  })

  // wait until localStorage become empty
  await page.waitForFunction(() => localStorage.length === 0)
  await page.reload({ waitUntil: ['load', 'domcontentloaded', 'networkidle0', 'networkidle2'] })
})

describe.each(emulatedDevices)('caret testing for all platform', device => {
  beforeAll(async () => {
    await page.emulate(device)
  })

  describe(device.name, () => {
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
  })

})

describe('caret testing for mobile platform', () => {
  beforeAll(async () => {
    await page.emulate(iPhone)
  })

  it.skip('noop', () => {
    expect(0).toBe(0)
  })
})

describe('caret testing for desktop platform', () => {
  beforeAll(async () => {
    await page.emulate(desktop)
  })

  it.skip('noop', () => {
    expect(0).toBe(0)
  })

})
