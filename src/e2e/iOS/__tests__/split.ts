/**
 * @jest-environment ./src/e2e/webdriverio-environment.js
 */

import { Browser } from 'webdriverio'
import getEditingText from '../helpers/getEditingText'
import paste from '../helpers/paste'
import waitForEditable from '../helpers/waitForEditable'
import clickThought from '../helpers/clickThought'
import tapWithOffset from '../helpers/tapWithOffset'
import tapReturnKey from '../helpers/tapReturnKey'
import initSession from '../helpers/initSession'

jest.setTimeout(90000)
const mobileBrowser = browser as unknown as Browser<'async'>

beforeEach(initSession())

it('split a thought when the caret is in the middle', async () => {
  const importText = `
  - puppeteer
    - web scraping
  - insomnia
    - rest api`

  await paste(mobileBrowser, importText)

  await waitForEditable(mobileBrowser, 'puppeteer')
  await clickThought(mobileBrowser, 'puppeteer')

  await waitForEditable(mobileBrowser, 'web scraping')
  await clickThought(mobileBrowser, 'web scraping')

  const editableNodeHandle = await waitForEditable(mobileBrowser, 'web scraping')
  await tapWithOffset(mobileBrowser, editableNodeHandle, { offset: 3 })

  await tapReturnKey(mobileBrowser)

  const offset = await mobileBrowser.execute(() => window.getSelection()?.focusOffset)
  expect(offset).toBe(0)

  const editingText = await getEditingText(mobileBrowser)
  expect(editingText).toBe('scraping')
})
