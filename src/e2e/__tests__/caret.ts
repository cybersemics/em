/**
 * @jest-environment ./src/e2e/puppeteer-environment.js
 */

import { delay } from '../../test-helpers/delay'
import clickBullet from '../../test-helpers/e2e-helpers/clickBullet'
import clickEditable from '../../test-helpers/e2e-helpers/clickEditable'
import getEditableContextHashFromSelection from '../../test-helpers/e2e-helpers/getEditableContextFromSelection'
import importTextFirstMatch from '../../test-helpers/e2e-helpers/importTextFirstMatch'
import setCursorAndSelection from '../../test-helpers/e2e-helpers/setCursorAndSelection'
import { hashContext } from '../../util'

beforeEach(async () => {
  await page.click('#skip-tutorial')
})

afterEach(async () => {
  await page.evaluate(async () => {
    const testHelpers = (window.em as any).testHelpers
    await testHelpers.clearAll()
    await localStorage.clear()
  })

  await page.reload({
    waitUntil: 'load'
  })

  // wait for alerts to get dismissed
  await delay(50)
})

describe('caret testing', () => {
  it('caret should be at the beginning of thought after split on enter', async () => {

    await page.keyboard.press('Enter')

    const importText = `
    - puppeteer
      - web scrapping
    - insomnia
      - rest api`

    await importTextFirstMatch(page, [''], importText)

    await setCursorAndSelection(page, {
      unrankedPath: ['puppeteer', 'web scrapping'],
      offset: 3
    })

    await page.keyboard.press('Enter')

    const offset = await page.evaluate(() => window.getSelection()?.focusOffset)

    expect(offset).toBe(0)
  })

  it('clicking a bullet, the caret should move to the beginning of the thought', async () => {

    await page.keyboard.press('Enter')

    const importText = `
    - Don't stay awake for too long
      - I don't wanna fall asleep`

    await importTextFirstMatch(page, [''], importText)

    await setCursorAndSelection(page, {
      unrankedPath: ['Don\'t stay awake for too long', 'I don\'t wanna fall asleep'],
      offset: 10
    })

    const hashedContext = hashContext(['Don\'t stay awake for too long'], 0)

    await clickBullet(page, hashedContext)

    const offset = await page.evaluate(() => window.getSelection()?.focusOffset)

    expect(offset).toBe(0)
  })

  it('clicking to the left of a thought, the caret should move to the beginning of the thought.', async () => {

    await page.keyboard.press('Enter')

    const importText = `
    - Purple Rain`

    await importTextFirstMatch(page, [''], importText)

    await setCursorAndSelection(page, {
      unrankedPath: ['Richard Feynman'],
      offset: 5
    })

    const hashedContext = hashContext(['Purple Rain'], 0)

    await clickEditable(page, {
      hashedContext,
      horizontalClickLine: 'left'
    })

    const offset = await page.evaluate(() => window.getSelection()?.focusOffset)

    expect(offset).toBe(0)
  })

  it('clicking to the right of a thought, the caret should move to the end of the thought.', async () => {

    await page.keyboard.press('Enter')

    const importText = `
    - Richard Feynman`

    await importTextFirstMatch(page, [''], importText)

    await setCursorAndSelection(page, {
      unrankedPath: ['Richard Feynman'],
      offset: 0
    })

    const hashedContext = hashContext(['Richard Feynman'], 0)

    await clickEditable(page, {
      hashedContext,
      horizontalClickLine: 'right'
    })

    const offset = await page.evaluate(() => window.getSelection()?.focusOffset)

    expect(offset).toBe('Richard Feynman'.length)
  })

  it('clicking in the middle of a thought, the caret should be set to the point that is clicked.', async () => {

    await page.keyboard.press('Enter')

    const importText = `
    - Freddie Mercury`

    await importTextFirstMatch(page, [''], importText)

    await setCursorAndSelection(page, {
      unrankedPath: ['Freddie Mercury'],
      offset: 0
    })

    const hashedContext = hashContext(['Freddie Mercury'], 0)

    // click on the given offset node of the editable using mouse click
    await clickEditable(page, {
      hashedContext,
      offset: 7
    })

    const offset = await page.evaluate(() => window.getSelection()?.focusOffset)

    expect(offset).toBe(7)
  })

  it('on cursorDown, the caret should move to the beginning of the new cursor.', async () => {

    await page.keyboard.press('Enter')

    const importText = `
    - Dogs
      - Husky
      - Labrador
      - Golden Retriever`

    await importTextFirstMatch(page, [''], importText)

    await setCursorAndSelection(page, {
      unrankedPath: ['Dogs', 'Husky'],
      offset: 0
    })

    await page.keyboard.press('ArrowDown')

    const focusedEditableContextHash = await getEditableContextHashFromSelection(page)

    const contextHash = hashContext(['Dogs', 'Labrador'], 1)

    // the focus must be in Dogs/Labrador after cursor down
    expect(contextHash).toBe(focusedEditableContextHash)

    const offset = await page.evaluate(() => window.getSelection()?.focusOffset)

    expect(offset).toBe(0)
  })
})
