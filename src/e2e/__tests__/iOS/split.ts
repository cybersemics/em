/**
 * @jest-environment ./src/e2e/webdriverio-environment.js
 */

import { Browser } from 'webdriverio'
import getEditingText from '../../helpers/mobile/getEditingText'
import paste from '../../helpers/mobile/paste'
import waitForEditable from '../../helpers/mobile/waitForEditable'
import clickThought from '../../helpers/mobile/clickThought'
import tapWithOffset from '../../helpers/mobile/tapWithOffset'
import tapReturnKey from '../../helpers/mobile/tapReturnKey'
import gesture from '../../helpers/mobile/gesture'
import initSession from '../../helpers/mobile/initSession'
import { gestures } from '../../helpers/constants'

jest.setTimeout(90000)
const mobileBrowser = browser as unknown as Browser<'async'>

beforeEach(initSession())

it('split a thought when the caret is in the middle', async () => {
  const importText = `
  - puppeteer
    - web scraping
  - insomnia
    - rest api`

  await gesture(mobileBrowser, gestures.newThought)
  const focusNode = await mobileBrowser.execute(() => window.getSelection()?.focusNode)
  expect(focusNode).toBeTruthy()
  await paste(mobileBrowser, [''], importText)

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
