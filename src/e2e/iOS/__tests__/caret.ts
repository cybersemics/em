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
  // https://github.com/cybersemics/em/issues/4426
  it.skip('Caret placed at the end of a wrapped line whose next line begins with formatted text stays on that line', async () => {
    await paste(
      'Lorem ipsum dolor sit amet, <b>consectetur adipiscing elit</b>, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
    )

    const editableNodeHandle = await getEditable('Lorem ipsum dolor sit amet,')
    // Enter edit mode.
    await tap(editableNodeHandle, { y: 8, x: 8 })
    await waitUntil(isKeyboardShown)

    // Measure the layout. The plain text node "Lorem ipsum dolor sit amet, " occupies the first visual
    // line and the bold text wraps onto the next line. Compute the first line's vertical center relative
    // to the editable's center, which is what tap's `y` option is added to.
    const { boldStart, tapYOffset, boldWrapsToNewLine } = await browser.execute(() => {
      const editable = document.querySelector('[data-editing=true] [data-editable]') as HTMLElement
      const rect = editable.getBoundingClientRect()
      const plainNode = editable.firstChild as Text
      const boldNode = editable.querySelector('b')!.firstChild as Text
      const plainLen = plainNode.textContent!.length
      const rPlainEnd = document.createRange()
      rPlainEnd.setStart(plainNode, plainLen - 1)
      rPlainEnd.setEnd(plainNode, plainLen)
      const plainLastCharRect = rPlainEnd.getBoundingClientRect()
      const rBold0 = document.createRange()
      rBold0.setStart(boldNode, 0)
      rBold0.setEnd(boldNode, 1)
      const boldFirstRect = rBold0.getBoundingClientRect()
      return {
        boldStart: plainLen,
        tapYOffset: Math.round(plainLastCharRect.top + plainLastCharRect.height / 2 - (rect.y + rect.height / 2)),
        boldWrapsToNewLine: boldFirstRect.top > plainLastCharRect.top + 3,
      }
    })

    // Precondition: the bold text must wrap onto the next visual line for this bug to manifest.
    expect(boldWrapsToNewLine).toBe(true)

    // Tap the end of the first visual line (just past its right edge, at the line's vertical center).
    await tap(editableNodeHandle, { horizontalTapLine: 'right', y: tapYOffset })

    // Read the caret's global offset across the editable's text nodes.
    const caretOffset = await browser.execute(() => {
      const sel = window.getSelection()!
      const editable = document.querySelector('[data-editing=true] [data-editable]') as HTMLElement
      const walker = document.createTreeWalker(editable, NodeFilter.SHOW_TEXT)
      let node: Node | null
      let global = 0
      while ((node = walker.nextNode())) {
        if (node === sel.focusNode) return global + sel.focusOffset
        global += (node.textContent || '').length
      }
      return -1
    })

    // The caret must stay on the first line (before the bold boundary), not jump to the start of the bold
    // text on the next line (which corresponds to offset === boldStart).
    expect(caretOffset).toBeLessThan(boldStart)
  })

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
