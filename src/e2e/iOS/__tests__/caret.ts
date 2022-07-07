/**
 * @jest-environment ./src/e2e/webdriverio-environment.js
 */
import { Element } from 'webdriverio'
import { gestures } from '../../../test-helpers/constants'
import helpers from '../helpers'

jest.setTimeout(100000)

const {
  clickThought,
  editThought,
  gesture,
  getEditable,
  getEditingText,
  getElementRectByScreen,
  getSelection,
  hideKeyboardByTappingDone,
  isKeyboardShown,
  newThought,
  paste,
  ref,
  tap,
  waitForEditable,
  waitUntil,
} = helpers()

// tests succeeds individually, but fails when there are too many tests running in parallel
// https://github.com/cybersemics/em/issues/1475
// https://github.com/cybersemics/em/issues/1523

it.skip('Enter edit mode ', async () => {
  await newThought('foo')
  await hideKeyboardByTappingDone()

  const editableNodeHandle = await waitForEditable('foo')
  await tap(editableNodeHandle)

  await waitUntil(isKeyboardShown)
  const selectionTextContent = await getSelection().focusNode?.textContent
  expect(selectionTextContent).toBe('foo')
})

it.skip('Preserve Editing: true', async () => {
  await newThought('foo')
  await newThought('bar', { insertNewSubthought: true })

  const editableNodeHandle = await getEditable('foo')
  await tap(editableNodeHandle)

  await waitUntil(async () => (await getEditingText()) === 'foo')
  const selectionTextContent = await getSelection().focusNode?.textContent
  expect(selectionTextContent).toBe('foo')
})

it.skip('Preserve Editing: false', async () => {
  await newThought('foo')
  await newThought('bar', { insertNewSubthought: true })
  await hideKeyboardByTappingDone()

  const editableNodeHandle = await waitForEditable('foo')
  await tap(editableNodeHandle)

  const selectionTextContent = await getSelection().focusNode?.textContent
  expect(selectionTextContent).toBe(null)
})

it.skip('No uncle loop', async () => {
  const importText = `
    - a
      - b
      - c`
  await newThought()
  await paste([''], importText)

  await clickThought('b')
  await newThought('d', { insertNewSubthought: true })

  const editableNodeHandle = await waitForEditable('c')
  await tap(editableNodeHandle)
  await waitUntil(async () => (await getEditingText()) === 'c')

  const selectionTextContent = await getSelection().focusNode?.textContent
  expect(selectionTextContent).toBe('c')
})

it.skip('Tap hidden root thought', async () => {
  const importText = `
  - a
    - b
      - c
  - d`
  await newThought()
  await paste([''], importText)
  await clickThought('a')
  await clickThought('b')
  await clickThought('c')

  const editableNodeHandle = await waitForEditable('d')
  await tap(editableNodeHandle)
  await waitUntil(async () => (await getEditingText()) !== 'c')

  const editingText = await getEditingText()
  expect(editingText).toBe('b')
})

it.skip('Tap hidden uncle', async () => {
  const importText = `
    - a
      - b
        - c
      - d`
  await newThought()
  await paste([''], importText)
  await clickThought('a')
  await clickThought('b')
  await clickThought('c')

  const editableNodeHandle = await waitForEditable('d')
  await tap(editableNodeHandle)

  await waitUntil(async () => (await getEditingText()) === 'd')
  const selectionTextContent = await getSelection().focusNode?.textContent
  expect(selectionTextContent).toBe('d')
})

it.skip('Tap empty content while keyboard up', async () => {
  const importText = `
    - a
      - b
        - c
      - d`

  await newThought()
  await paste([''], importText)
  await clickThought('b')
  await clickThought('c')

  const editableNodeHandleD = await waitForEditable('d')
  await tap(editableNodeHandleD, { x: 20, y: 200 })

  // Wait until cursor change
  await waitUntil(async () => (await getEditingText()) === 'b')
  expect(await isKeyboardShown()).toBeTruthy()
  const selectionTextContent = await getSelection().focusNode?.textContent
  expect(selectionTextContent).toBe('b')
})

it.skip('Tap empty content while keyboard down', async () => {
  const importText = `
    - a
      - b
        - c
      - d`

  await newThought()
  await paste([''], importText)
  await clickThought('b')
  await clickThought('c')
  await hideKeyboardByTappingDone()

  const editableNodeHandleD = await waitForEditable('d')
  await tap(editableNodeHandleD, { x: 20, y: 200 })

  // Wait until cursor change
  await waitUntil(async () => (await getEditingText()) === 'b')
  expect(await isKeyboardShown()).toBeFalsy()
})

it.skip('Swipe over cursor', async () => {
  await newThought('foo')
  await hideKeyboardByTappingDone()

  const editableNodeHandle = await waitForEditable('foo')
  const elementRect = await getElementRectByScreen(editableNodeHandle)

  // swipe right on thought
  await gesture(['r'], {
    xStart: elementRect.x + 5,
    yStart: elementRect.y + elementRect.height / 2,
    segmentLength: elementRect.width,
  })

  await tap(editableNodeHandle)

  const editingText = await getEditingText()
  expect(editingText).toBe('foo')

  const selectionTextContent = await getSelection().focusNode?.textContent
  expect(selectionTextContent).toBe(null)
})

it.skip('Swipe over hidden thought', async () => {
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

  await newThought()
  await paste([''], importText)
  await waitForEditable('i')
  await clickThought('a')
  await clickThought('x')
  await clickThought('y')

  const editableNodeHandle = await waitForEditable('y')
  const elementRect = await getElementRectByScreen(editableNodeHandle)

  await gesture(gestures.newThought, {
    xStart: elementRect.x + 5,
    yStart: elementRect.y + elementRect.height + 10,
  })
  await waitForEditable('')

  await editThought('this-is-new-thought')
  const newThoughtEditable = await waitForEditable('this-is-new-thought')

  // get first child of parent thought
  const previousSibling = await ref().execute((newThoughtEditable: Element<'async'>) => {
    const editable = (newThoughtEditable as unknown as HTMLElement)
      .closest('ul.children')
      ?.firstElementChild?.getElementsByClassName('editable')[0] as HTMLElement
    return editable?.innerText
  }, newThoughtEditable)

  expect(previousSibling).toBe('y')
})

it.skip('Bump Thought Down on a thought that has children', async () => {
  await newThought('foo')
  await newThought('bar', { insertNewSubthought: true })
  await hideKeyboardByTappingDone()

  const editableNodeHandle = await getEditable('foo')
  await tap(editableNodeHandle)

  await gesture(gestures.bumpThoughtDown)
  const newThoughtEditable = await editThought('new')
  const selectionTextContent = await getSelection().focusNode?.textContent

  const childrenTexts = await ref().execute((newThoughtEditable: Element<'async'>) => {
    const children = (newThoughtEditable as unknown as HTMLElement)
      .closest('ul.children')
      ?.firstElementChild?.getElementsByTagName('ul')[0]
      ?.getElementsByClassName('editable') as HTMLCollection
    return Array.from(children).map(x => (x as HTMLElement).innerText)
  }, newThoughtEditable)

  expect(selectionTextContent).toBe('new')
  expect(childrenTexts).toEqual(['foo', 'bar'])
})
