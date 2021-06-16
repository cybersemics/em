/**
 * @jest-environment ./src/e2e/webdriverio-environment.js
 */

import { Browser } from 'webdriverio'
import waitForEditable from '../helpers/waitForEditable'
import gesture from '../helpers/gesture'
import hideKeyboardByTappingDone from '../helpers/hideKeyboardByTappingDone'
import tapWithOffset from '../helpers/tapWithOffset'
import getEditingText from '../helpers/getEditingText'
import editThought from '../helpers/editThought'
import getEditable from '../helpers/getEditable'
import initSession from '../helpers/initSession'
import paste from '../helpers/paste'
import clickThought from '../helpers/clickThought'
import { gestures } from '../../../test-helpers/constants'

const mobileBrowser = browser as unknown as Browser<'async'>
jest.setTimeout(90000)

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

it('Tap hidden root thought', async () => {
  const importText = `
  - a
    - b
      - c
  - d`
  await gesture(mobileBrowser, gestures.newThought)
  await paste(mobileBrowser, [''], importText)
  await clickThought(mobileBrowser, 'a')
  await clickThought(mobileBrowser, 'b')
  await clickThought(mobileBrowser, 'c')

  const editableNodeHandle = await waitForEditable(mobileBrowser, 'd')
  await tapWithOffset(mobileBrowser, editableNodeHandle, { offset: 0 })
  await mobileBrowser.waitUntil(async () => await getEditingText(mobileBrowser) !== 'c')

  const editingText = await getEditingText(mobileBrowser)
  expect(editingText).toBe('b')
})

it('Tap hidden uncle', async () => {
  const importText = `
    - a
      - b
        - c
      - d`
  await gesture(mobileBrowser, gestures.newThought)
  await paste(mobileBrowser, [''], importText)
  await clickThought(mobileBrowser, 'a')
  await clickThought(mobileBrowser, 'b')
  await clickThought(mobileBrowser, 'c')

  const editableNodeHandle = await waitForEditable(mobileBrowser, 'd')
  await tapWithOffset(mobileBrowser, editableNodeHandle, { offset: 0 })

  await mobileBrowser.waitUntil(async () => await getEditingText(mobileBrowser) === 'd')
  const selectionTextContent = await mobileBrowser.execute(() => window.getSelection()?.focusNode?.textContent)
  expect(selectionTextContent).toBe('d')
})
