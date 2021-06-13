/**
 * @jest-environment ./src/e2e/webdriverio-environment.js
 */

import { Browser } from 'webdriverio'
import waitForEditable from '../../helpers/mobile/waitForEditable'
import gesture from '../../helpers/mobile/gesture'
import hideKeyboardByTappingDone from '../../helpers/mobile/hideKeyboardByTappingDone'
import tapWithOffset from '../../helpers/mobile/tapWithOffset'
import getEditingText from '../../helpers/mobile/getEditingText'
import editThought from '../../helpers/mobile/editThought'
import getEditable from '../../helpers/mobile/getEditable'
import initSession from '../../helpers/mobile/initSession'
import { gestures } from '../../helpers/constants'
import paste from '../../helpers/mobile/paste'
import clickThought from '../../helpers/mobile/clickThought'

jest.setTimeout(90000)
const mobileBrowser = browser as unknown as Browser<'async'>

beforeEach(initSession())

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

it('Preserve Editing: false', async () => {
  await gesture(mobileBrowser, gestures.newThought)
  await editThought(mobileBrowser, 'foo')
  await gesture(mobileBrowser, gestures.newSubThought)
  await editThought(mobileBrowser, 'bar')
  await hideKeyboardByTappingDone(mobileBrowser)

  const editableNodeHandle = await waitForEditable(mobileBrowser, 'foo')
  await tapWithOffset(mobileBrowser, editableNodeHandle, { offset: 0 })

  const selectionTextContent = await mobileBrowser.execute(() => window.getSelection()?.focusNode?.textContent)
  expect(selectionTextContent).toBe(null)
})

it('No uncle loop', async () => {
  const importText = `
    - a
      - b
      - c`
  await gesture(mobileBrowser, gestures.newThought)
  await paste(mobileBrowser, [''], importText)

  await clickThought(mobileBrowser, 'b')
  await gesture(mobileBrowser, gestures.newSubThought)
  await editThought(mobileBrowser, 'd')

  const editableNodeHandle = await waitForEditable(mobileBrowser, 'c')
  await tapWithOffset(mobileBrowser, editableNodeHandle, { offset: 0 })
  await mobileBrowser.waitUntil(async () => await getEditingText(mobileBrowser) === 'c')

  const selectionTextContent = await mobileBrowser.execute(() => window.getSelection()?.focusNode?.textContent)
  expect(selectionTextContent).toBe('c')
})
