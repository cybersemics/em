/**
 * @jest-environment ./src/e2e/webdriverio-environment.js
 */

import { gestures } from '../../../test-helpers/constants'
import helpers from '../helpers'

jest.setTimeout(90000)

const {
  clickThought,
  gesture,
  editThought,
  getEditable,
  getEditingText,
  getElementRectByScreen,
  getSelection,
  hideKeyboardByTappingDone,
  isKeyboardShown,
  paste,
  ref,
  type,
  tap,
  waitForEditable,
  waitUntil,
} = helpers()

it('Enter edit mode', async () => {
  await gesture(gestures.newThought)
  await type('foo')
  await hideKeyboardByTappingDone()

  const editableNodeHandle = await waitForEditable('foo')
  await tap(editableNodeHandle)

  await waitUntil(isKeyboardShown)
  const selectionTextContent = await getSelection().focusNode?.textContent
  expect(selectionTextContent).toBe('foo')
})

it('Preserve Editing: true', async () => {
  await gesture(gestures.newThought)
  await editThought('foo')
  await gesture(gestures.newSubThought)
  await editThought('bar')

  const editableNodeHandle = await getEditable('foo')
  await tap(editableNodeHandle)

  await waitUntil(async () => await getEditingText() === 'foo')
  const selectionTextContent = await getSelection().focusNode?.textContent
  expect(selectionTextContent).toBe('foo')
})

it('Preserve Editing: false', async () => {
  await gesture(gestures.newThought)
  await editThought('foo')
  await gesture(gestures.newSubThought)
  await editThought('bar')
  await hideKeyboardByTappingDone()

  const editableNodeHandle = await waitForEditable('foo')
  await tap(editableNodeHandle)

  const selectionTextContent = await getSelection().focusNode?.textContent
  expect(selectionTextContent).toBe(null)
})

it('No uncle loop', async () => {
  const importText = `
    - a
      - b
      - c`
  await gesture(gestures.newThought)
  await paste([''], importText)

  await clickThought('b')
  await gesture(gestures.newSubThought)
  await editThought('d')

  const editableNodeHandle = await waitForEditable('c')
  await tap(editableNodeHandle)
  await waitUntil(async () => await getEditingText() === 'c')

  const selectionTextContent = await getSelection().focusNode?.textContent
  expect(selectionTextContent).toBe('c')
})

it('Tap hidden root thought', async () => {
  const importText = `
  - a
    - b
      - c
  - d`
  await gesture(gestures.newThought)
  await paste([''], importText)
  await clickThought('a')
  await clickThought('b')
  await clickThought('c')

  const editableNodeHandle = await waitForEditable('d')
  await tap(editableNodeHandle)
  await waitUntil(async () => await getEditingText() !== 'c')

  const editingText = await getEditingText()
  expect(editingText).toBe('b')
})

it('Tap hidden uncle', async () => {
  const importText = `
    - a
      - b
        - c
      - d`
  await gesture(gestures.newThought)
  await paste([''], importText)
  await clickThought('a')
  await clickThought('b')
  await clickThought('c')

  const editableNodeHandle = await waitForEditable('d')
  await tap(editableNodeHandle)

  await waitUntil(async () => await getEditingText() === 'd')
  const selectionTextContent = await getSelection().focusNode?.textContent
  expect(selectionTextContent).toBe('d')
})

it('Tap empty content while keyboard up', async () => {
  const importText = `
    - a
      - b
        - c
      - d`

  await gesture(gestures.newThought)
  await paste([''], importText)
  await clickThought('b')
  await clickThought('c')

  const editableNodeHandleD = await waitForEditable('d')
  await tap(editableNodeHandleD, { x: 20, y: 200 })

  // Wait until cursor change
  await waitUntil(async () => await getEditingText() === 'b')
  expect(await isKeyboardShown()).toBeTruthy()
  const selectionTextContent = await getSelection().focusNode?.textContent
  expect(selectionTextContent).toBe('b')
})

it('Tap empty content while keyboard down', async () => {
  const importText = `
    - a
      - b
        - c
      - d`

  await gesture(gestures.newThought)
  await paste([''], importText)
  await clickThought('b')
  await clickThought('c')
  await hideKeyboardByTappingDone()

  const editableNodeHandleD = await waitForEditable('d')
  await tap(editableNodeHandleD, { x: 20, y: 200 })

  // Wait until cursor change
  await waitUntil(async () => await getEditingText() === 'b')
  expect(await isKeyboardShown()).toBeFalsy()
})

it('Swipe over cursor', async () => {
  await gesture(gestures.newThought)
  await editThought('foo')
  await hideKeyboardByTappingDone()

  const editableNodeHandle = await waitForEditable('foo')
  const elementRect = await getElementRectByScreen(editableNodeHandle)

  // swipe right on thought
  await gesture(['r'],
    {
      xStart: elementRect.x + 5,
      yStart: elementRect.y + (elementRect.height / 2),
      segmentLength: elementRect.width,
      waitMs: 60 // It looks like default 50ms is not enough for swiping.
    })

  await tap(editableNodeHandle)

  const editingText = await getEditingText()
  expect(editingText).toBe('foo')

  const selectionTextContent = await getSelection().focusNode?.textContent
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

  await gesture(gestures.newThought)
  await paste([''], importText)
  await waitForEditable('i')
  await clickThought('a')
  await clickThought('x')
  await clickThought('y')

  const editableNodeHandle = await waitForEditable('y')
  const elementRect = await getElementRectByScreen(editableNodeHandle)

  await gesture(gestures.newThought,
    {
      xStart: elementRect.x + 5,
      yStart: elementRect.y + elementRect.height + 10,
    })

  await editThought('this-is-new-thought')
  const newThoughtEditable = await waitForEditable('this-is-new-thought')

  // get first child of parent thought
  const previousSibling = await ref().execute((newThoughtEditable: Element) => {
    const editable = newThoughtEditable.closest('ul.children')?.firstElementChild?.getElementsByClassName('editable')[0] as HTMLElement
    return editable?.innerText
  }, newThoughtEditable as unknown as Element)

  expect(previousSibling).toBe('y')
})
