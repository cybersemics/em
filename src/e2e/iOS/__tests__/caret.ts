/**
 * IOS Safari caret positioning tests.
 * Uses WDIO test runner with Mocha framework.
 */
import gestures from '../../../test-helpers/gestures'
import clickThought from '../helpers/clickThought'
import editThought from '../helpers/editThought'
import gesture from '../helpers/gesture'
import getEditable from '../helpers/getEditable'
import getEditingText from '../helpers/getEditingText'
import getElementRectByScreen from '../helpers/getElementRectByScreen'
import getSelection from '../helpers/getSelection'
import hideKeyboardByTappingDone from '../helpers/hideKeyboardByTappingDone'
import isKeyboardShown from '../helpers/isKeyboardShown'
import newThought from '../helpers/newThought'
import paste from '../helpers/paste'
import tap from '../helpers/tap'
import waitForEditable from '../helpers/waitForEditable'
import waitUntil from '../helpers/waitUntil'

// tests succeeds individually, but fails when there are too many tests running in parallel
// https://github.com/cybersemics/em/issues/1475
// https://github.com/cybersemics/em/issues/1523

describe('Caret', () => {
  it('Enter edit mode', async () => {
    await newThought('foo')
    await hideKeyboardByTappingDone()

    const editableNodeHandle = await waitForEditable('foo')
    await tap(editableNodeHandle, { y: 60, x: 20 })

    await waitUntil(isKeyboardShown)
    const selectionTextContent = await getSelection().focusNode?.textContent
    expect(selectionTextContent).toBe('foo')
  })

  it('Preserve Editing: true', async () => {
    await newThought('foo')
    await newThought('bar', { insertNewSubthought: true })

    const editableNodeHandle = await waitForEditable('foo')
    await tap(editableNodeHandle, { y: 60, x: 20 })

    await waitUntil(async () => (await getEditingText()) === 'foo')
    const selectionTextContent = await getSelection().focusNode?.textContent
    expect(selectionTextContent).toBe('foo')
  })

  it('Preserve Editing: false', async () => {
    await newThought('foo')
    await newThought('bar', { insertNewSubthought: true })
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
    await newThought()
    await paste([''], importText)

    await clickThought('b')
    await newThought('d', { insertNewSubthought: true })

    const editableNodeHandle = await waitForEditable('c')
    await tap(editableNodeHandle, { y: 60, x: 20 })
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
    await tap(editableNodeHandle, { y: 60, x: 20 })
    await waitUntil(async () => (await getEditingText()) !== 'c')

    const editingText = await getEditingText()
    expect(editingText).toBe('b')
  })

  it('Tap hidden uncle', async () => {
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
    await tap(editableNodeHandle, { y: 60, x: 20 })

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

  it('Swipe over cursor', async () => {
    await newThought('foo')
    await hideKeyboardByTappingDone()

    const editableNodeHandle = await waitForEditable('foo')
    const elementRect = await getElementRectByScreen(editableNodeHandle)

    // swipe right on thought
    await gesture('r', {
      xStart: elementRect.x + 5,
      yStart: elementRect.y + elementRect.height / 2,
      segmentLength: elementRect.width,
    })

    await tap(editableNodeHandle, { y: 60, x: 20 })

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
    const previousSibling = await browser.execute((newThoughtEditable: HTMLElement) => {
      const editable = (newThoughtEditable as unknown as HTMLElement)
        .closest('ul.children')
        ?.firstElementChild?.querySelector('[data-editable]') as HTMLElement
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

    const childrenTexts = await browser.execute((newThoughtEditable: HTMLElement) => {
      const children = (newThoughtEditable as unknown as HTMLElement)
        .closest('ul.children')
        ?.firstElementChild?.getElementsByTagName('ul')[0]
        ?.querySelectorAll('[data-editable]') as NodeListOf<HTMLElement>
      return Array.from(children).map(x => (x as HTMLElement).innerText)
    }, newThoughtEditable)

    expect(selectionTextContent).toBe('new')
    expect(childrenTexts).toEqual(['foo', 'bar'])
  })
})
