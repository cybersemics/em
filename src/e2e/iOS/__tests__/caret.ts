/**
 * IOS Safari caret positioning tests.
 * Uses WDIO test runner with Mocha framework.
 */
import clickThought from '../helpers/clickThought'
import gesture from '../helpers/gesture'
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
    await tap(editableNodeHandle, { y: 60 })

    await waitUntil(isKeyboardShown)
    const selectionTextContent = await getSelection().focusNode?.textContent
    expect(selectionTextContent).toBe('foo')
  })

  it('Preserve Editing: true', async () => {
    await newThought('foo')
    await newThought('bar', { insertNewSubthought: true })

    const editableNodeHandle = await waitForEditable('foo')
    await tap(editableNodeHandle, { y: 60 })

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
    await tap(editableNodeHandle, { y: 60 })
    await waitUntil(async () => (await getEditingText()) === 'c')

    const selectionTextContent = await getSelection().focusNode?.textContent
    expect(selectionTextContent).toBe('c')
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
    await tap(editableNodeHandle, { y: 60 })

    await waitUntil(async () => (await getEditingText()) === 'd')
    const selectionTextContent = await getSelection().focusNode?.textContent
    expect(selectionTextContent).toBe('d')
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

    await tap(editableNodeHandle, { y: 60 })

    const editingText = await getEditingText()
    expect(editingText).toBe('foo')

    const selectionTextContent = await getSelection().focusNode?.textContent
    expect(selectionTextContent).toBe(null)
  })

  /**
   * Reproduction of #4394 and #4291. Tapping ~4px past the right edge of a non-cursor thought incorrectly opened the
   * virtual keyboard. Safari's touch-adjustment heuristic retargets the synthesized mouse cascade onto the
   * nearby editable while the `touchstart`/`touchend` land on the thought-annotation overlay, so the
   * editable's `onTouchEnd` never runs to `preventDefault`.
   */
  it('Keyboard incorrectly opens on the right-edge tap of a non-cursor thought (#4394)', async () => {
    await newThought('Hello')

    const editable = await waitForEditable('Hello')
    await browser.execute(() => window.scrollTo(0, 0))
    const rect = await getElementRectByScreen(editable)

    // Prime with a tap on the thought's center + keyboard dismissal. Priming while
    // "Hello" has the cursor is what leaves offsetRef.current set (and never reset) pre-#4371.
    await browser.performActions([
      {
        type: 'pointer',
        id: 'finger1',
        parameters: { pointerType: 'touch' },
        actions: [
          {
            type: 'pointerMove',
            duration: 0,
            x: Math.round(rect.x + rect.width / 2),
            y: Math.round(rect.y + rect.height / 2),
            origin: 'viewport',
          },
          { type: 'pointerDown', button: 0 },
          { type: 'pause', duration: 60 },
          { type: 'pointerUp', button: 0 },
        ],
      },
    ])
    await hideKeyboardByTappingDone()

    // Cursor Back (swipe right) to set the cursor to null, so that "Hello" becomes a non-cursor thought.
    await gesture('r', {
      xStart: rect.x + 5,
      yStart: rect.y + rect.height / 2,
      segmentLength: rect.width,
    })

    // Tap just past the right edge of the thought text, vertically centered.
    const tapX = Math.round(rect.x + rect.width + 4)
    const tapY = Math.round(rect.y + rect.height / 2)
    await browser.performActions([
      {
        type: 'pointer',
        id: 'finger1',
        parameters: { pointerType: 'touch' },
        actions: [
          {
            type: 'pointerMove',
            duration: 0,
            x: tapX,
            y: tapY,
            origin: 'viewport',
            width: 40,
            height: 40,
            pressure: 0.9,
          },
          { type: 'pointerDown', button: 0 },
          { type: 'pause', duration: 90 },
          { type: 'pointerUp', button: 0 },
        ],
      },
    ])

    const keyboard = await isKeyboardShown()

    // A non-cursor thought must not open the virtual keyboard.
    expect(keyboard).toBe(false)
  })
})
