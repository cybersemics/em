/**
 * @jest-environment ./src/e2e/webdriverio-environment.js
 */

import { Browser } from 'webdriverio'
import waitForElement from '../../helpers/mobile/waitForElement'
import waitForEditable from '../../helpers/mobile/waitForEditable'
import gesture from '../../helpers/mobile/gestures/gesture'
import hideKeyboardByTappingDone from '../../helpers/mobile/hideKeyboardByTappingDone'
import tapWithOffset from '../../helpers/mobile/tapWithOffset'
import getEditingText from '../../helpers/mobile/getEditingText'
import editThought from '../../helpers/mobile/editThought'
import getEditable from '../../helpers/mobile/getEditable'
import { gestures } from '../../helpers/constants'

jest.setTimeout(90000)
const mobileBrowser = browser as unknown as Browser<'async'>
let isFirstTest = true
describe('Caret & Cursor Test', () => {

  beforeEach(async() => {
    // Don't reload session for the first test. webdriverio already creates a session on init.
    if (!isFirstTest) {
      await mobileBrowser.reloadSession()
    }
    else {
      isFirstTest = false
    }

    await mobileBrowser.url('http://bs-local.com:3000')
    const skipElement = await waitForElement(mobileBrowser, '#skip-tutorial')
    await skipElement.click()
  })

  it('Enter edit mode', async () => {
    await gesture(mobileBrowser, gestures.newThought)
    await mobileBrowser.sendKeys(['foo'])

    await hideKeyboardByTappingDone(mobileBrowser)
    const selection = await mobileBrowser.execute(() => window.getSelection())
    expect(selection?.focusOffset).toBe(0)
    expect(selection?.focusNode).toBe(null)

    const editableNodeHandle = await waitForEditable(mobileBrowser, 'foo')
    await tapWithOffset(mobileBrowser, editableNodeHandle, { offset: 0 })

    await mobileBrowser.waitUntil(() => mobileBrowser.isKeyboardShown())
    const selectionTextContent = await mobileBrowser.execute(() => window.getSelection()?.focusNode?.textContent)
    expect(selectionTextContent).toBe('foo')
  })

  it('Preserve Editing: true', async () => {
    await gesture(mobileBrowser, gestures.newThought)
    await editThought(mobileBrowser, 'foo')
    await gesture(mobileBrowser, gestures.newSubThought)
    await editThought(mobileBrowser, 'bar')

    const editableNodeHandle = await getEditable(mobileBrowser, 'foo')
    await tapWithOffset(mobileBrowser, editableNodeHandle, { offset: 0 })

    await mobileBrowser.waitUntil(async () => await getEditingText(mobileBrowser) === 'foo')
    const selectionTextContent = await mobileBrowser.execute(() => window.getSelection()?.focusNode?.textContent)
    expect(selectionTextContent).toBe('foo')
  })

})
