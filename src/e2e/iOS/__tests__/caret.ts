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
import getElementRectByScreen from '../helpers/getElementRectByScreen'

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

it('Tap empty content while keyboard up', async () => {
  const importText = `
    - a
      - b
        - c
      - d`

  await gesture(mobileBrowser, gestures.newThought)
  await paste(mobileBrowser, [''], importText)
  await clickThought(mobileBrowser, 'b')
  await clickThought(mobileBrowser, 'c')

  const editableNodeHandleD = await waitForEditable(mobileBrowser, 'd')
  await tapWithOffset(mobileBrowser, editableNodeHandleD, { x: 20, y: 200 })

  // Wait until cursor change
  await mobileBrowser.waitUntil(async () => await getEditingText(mobileBrowser) === 'b')
  expect(await mobileBrowser.isKeyboardShown()).toBeTruthy()
  const selectionTextContent = await mobileBrowser.execute(() => window.getSelection()?.focusNode?.textContent)
  expect(selectionTextContent).toBe('b')
})

it('Tap empty content while keyboard down', async () => {
  const importText = `
    - a
      - b
        - c
      - d`

  await gesture(mobileBrowser, gestures.newThought)
  await paste(mobileBrowser, [''], importText)
  await clickThought(mobileBrowser, 'b')
  await clickThought(mobileBrowser, 'c')
  await hideKeyboardByTappingDone(mobileBrowser)

  const editableNodeHandleD = await waitForEditable(mobileBrowser, 'd')
  await tapWithOffset(mobileBrowser, editableNodeHandleD, { x: 20, y: 200 })

  // Wait until cursor change
  await mobileBrowser.waitUntil(async () => await getEditingText(mobileBrowser) === 'b')
  expect(await mobileBrowser.isKeyboardShown()).toBeFalsy()
})

it('Swipe over cursor', async () => {
  await gesture(mobileBrowser, gestures.newThought)
  await editThought(mobileBrowser, 'foo')
  await hideKeyboardByTappingDone(mobileBrowser)

  const editableNodeHandle = await waitForEditable(mobileBrowser, 'foo')
  const elementRect = await getElementRectByScreen(mobileBrowser, editableNodeHandle)

  // swipe right on thought
  await gesture(mobileBrowser, ['r'],
    {
      xStart: elementRect.x + 5,
      yStart: elementRect.y + (elementRect.height / 2),
      segmentLength: elementRect.width,
      waitMs: 60 // It looks like default 50ms is not enough for swiping.
    })

  await tapWithOffset(mobileBrowser, editableNodeHandle, { offset: 0 })

  const editingText = await getEditingText(mobileBrowser)
  expect(editingText).toBe('foo')

  const selectionTextContent = await mobileBrowser.execute(() => window.getSelection()?.focusNode?.textContent)
  expect(selectionTextContent).toBe(null)
})

it('Swipe over hidden thought', async () => {
  const importText = `
    - a
      - x
        - y
    - b
    - c
    - d
    - e
    - f
    - g
    - h
    - i`

  await gesture(mobileBrowser, gestures.newThought)
  await paste(mobileBrowser, [''], importText)
  await waitForEditable(mobileBrowser, 'i')
  await clickThought(mobileBrowser, 'a')
  await clickThought(mobileBrowser, 'x')
  await clickThought(mobileBrowser, 'y')

  const editableNodeHandle = await waitForEditable(mobileBrowser, 'y')
  const elementRect = await getElementRectByScreen(mobileBrowser, editableNodeHandle)

  await gesture(mobileBrowser, gestures.newThought,
    {
      xStart: elementRect.x + 5,
      yStart: elementRect.y + elementRect.height + 10,
    })

  await editThought(mobileBrowser, 'this-is-new-thought')
  const newThoughtEditable = await waitForEditable(mobileBrowser, 'this-is-new-thought')

  // get first child of parent thought
  const previousSibling = await mobileBrowser.execute((newThoughtEditable: any) => {
    return newThoughtEditable.closest('ul.children').firstElementChild.getElementsByClassName('editable')[0].innerText
  }, newThoughtEditable)

  expect(previousSibling).toBe('y')
})
