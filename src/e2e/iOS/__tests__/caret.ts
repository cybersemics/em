/**
 * IOS Safari caret positioning tests.
 * Uses WDIO test runner with Mocha framework.
 */
import gestures from '../../../test-helpers/gestures'
import clickThought from '../helpers/clickThought'
import disableTransitions from '../helpers/disableTransitions'
import editThought from '../helpers/editThought'
import gesture from '../helpers/gesture'
import getEditable from '../helpers/getEditable'
import getEditingText from '../helpers/getEditingText'
import getElementRectByScreen from '../helpers/getElementRectByScreen'
import getSelection from '../helpers/getSelection'
import hideKeyboardByTappingDone from '../helpers/hideKeyboardByTappingDone'
import isKeyboardShown from '../helpers/isKeyboardShown'
import keyboard from '../helpers/keyboard'
import newThought from '../helpers/newThought'
import paste from '../helpers/paste'
import scrubSpaceBar from '../helpers/scrubSpaceBar'
import setFontSize from '../helpers/setFontSize'
import setSelection from '../helpers/setSelection'
import showEditMenu from '../helpers/showEditMenu'
import tap from '../helpers/tap'
import tapEditMenuItem from '../helpers/tapEditMenuItem'
import waitForCaretOffset from '../helpers/waitForCaretOffset'
import waitForEditable from '../helpers/waitForEditable'
import waitForElement from '../helpers/waitForElement'
import waitUntil from '../helpers/waitUntil'

/** Returns the caret's plain-text offset within the element, counted across any nested nodes, or null if the caret is not in it. Mirrors selection.offsetFromNode, which browser.execute cannot import. */
const getCaretOffsetIn = (element: WebdriverIO.Element) =>
  browser.execute(el => {
    const selection = window.getSelection()
    if (!selection?.focusNode || !el.contains(selection.focusNode)) return null
    const range = document.createRange()
    range.selectNodeContents(el)
    range.setEnd(selection.focusNode, selection.focusOffset)
    return range.toString().length
  }, element)

/** Returns the element's text content. Read in the page, since Safari's WebDriver does not implement getProperty. */
const getTextContent = (element: WebdriverIO.Element) => browser.execute(el => el.textContent, element)

// tests succeeds individually, but fails when there are too many tests running in parallel
// https://github.com/cybersemics/em/issues/1475
// https://github.com/cybersemics/em/issues/1523

describe('Caret', () => {
  it('Enter edit mode', async () => {
    await newThought('foo')
    await hideKeyboardByTappingDone()

    const editableNodeHandle = await waitForEditable('foo')
    await tap(editableNodeHandle)

    await waitUntil(isKeyboardShown)
    const selectionTextContent = await getSelection().focusNode?.textContent
    expect(selectionTextContent).toBe('foo')
  })

  // Entering edit mode focuses the thought, and Editable's onFocus would set the cursor with no offset, moving the caret
  // to the start of the thought, unless the tap has already entered edit mode.
  it('Enter edit mode at the tapped word', async () => {
    const value = 'Hello world'
    await newThought(value)
    await hideKeyboardByTappingDone()

    // tap the "w" of "world", a little inside the glyph so that the tap does not land on the word boundary, and
    // quickly, since a slow tap near the caret gets no mouse events
    const editable = await waitForEditable(value)
    await tap(editable, { offset: 'Hello '.length, x: 3, pointerType: 'touch', releaseDelayMs: 30 })

    await waitUntil(isKeyboardShown)
    await waitForCaretOffset('Hello '.length)
  })

  it('Preserve Editing: true', async () => {
    await newThought('foo')
    await newThought('bar', { insertNewSubthought: true })

    const editableNodeHandle = await waitForEditable('foo')
    await tap(editableNodeHandle)

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
    await tap(editableNodeHandle)

    await waitUntil(async () => (await getEditingText()) === 'd')
    const selectionTextContent = await getSelection().focusNode?.textContent
    expect(selectionTextContent).toBe('d')
  })

  // #3276: The virtual keyboard's trackpad (long press the space bar) moves the caret by hit-testing a point
  // that follows the finger across the whole document, not by walking the focused editing host, so any thought
  // that is an editing host can capture the caret mid-drag. Does not reproduce in the Simulator, which keeps
  // the caret in its editing host; a real device drags it out on the pinned iOS as readily as on a current one.
  it('a caret scrubbed past the left edge stays in the cursor thought (#3276)', async () => {
    await newThought()
    await paste(
      [''],
      `
    - a
      - b
        - c
          - d
        - e`,
    )

    // the issue reports a smaller font makes it easier to trigger, the rows sitting closer together
    await setFontSize(16)

    // the cursor must be deep enough that moving it up collapses a subtree, which is what moves the thoughts
    // under the finger and lets the caret keep walking
    await clickThought('a')
    await clickThought('b')
    await clickThought('c')

    const editable = await waitForEditable('d')
    await tap(editable)
    await tap(editable)
    await waitUntil(isKeyboardShown)

    await scrubSpaceBar(-6)

    // unfixed, the cursor walks to an ancestor, the selection is left nowhere, and the keyboard stays up over
    // a thought that can no longer be typed into
    expect(await getEditingText()).toBe('d')
    expect(await getSelection().focusNode?.textContent).toBe('d')
    expect(await isKeyboardShown()).toBeTruthy()

    await keyboard.type('123')
    // The caret was restored at the start of the thought
    expect(await getEditingText()).toBe('123d')
  })

  // The same hit test escapes a note without any drag: a note is short enough that the point lands outside it
  // as soon as the space bar is held, and it leaves from the end, where the note abuts the parent thought.
  it('a caret scrubbed in a note stays in the note (#3276)', async () => {
    // The note slides into place after the paste, and a tap aimed at it mid-slide lands on the parent thought.
    await disableTransitions()
    // Import the thoughts before the keyboard opens. Opening it first, e.g. with newThought, lets Safari scroll the page,
    // so the cursor scroll that follows the import moves the note while it is being tapped.
    await paste(`
    - a
      - =note
        - A`)

    const note = await waitForElement('[aria-label="note-editable"]')
    await tap(note)
    await waitUntil(isKeyboardShown)

    // zero steps: holding the space bar is the whole gesture
    await scrubSpaceBar(0)

    // unfixed, the selection is left nowhere with the keyboard still up
    expect(await getSelection().focusNode?.textContent).toBe('A')
    expect(await getSelection().focusOffset).toBe(1)
    expect(await isKeyboardShown()).toBeTruthy()
  })

  // https://github.com/cybersemics/em/issues/3828
  it('a caret pasted into the middle of a note stays after the pasted text', async () => {
    await disableTransitions()
    await paste(`
    - Lorem Ipsum Dolor Sit Amet
      - =note
        - Sed tortor nunc`)

    await tap(await waitForEditable('Lorem Ipsum Dolor Sit Amet'), { pointerType: 'touch' })
    await setSelection('Lorem '.length, 'Lorem Ipsum'.length)
    await showEditMenu()
    await tapEditMenuItem('Copy')

    // The first tap places the caret between "Sed " and "tortor", the second raises the edit menu on it.
    const note = await waitForElement('[aria-label="note-editable"]')
    await tap(note, { pointerType: 'touch', offset: 'Sed '.length })
    await waitUntil(isKeyboardShown)
    await tap(note, { pointerType: 'touch', offset: 'Sed '.length })
    await tapEditMenuItem('Paste')

    await waitUntil(async () => (await getTextContent(note)) !== 'Sed tortor nunc')
    expect(await getTextContent(note)).toBe('Sed Ipsumtortor nunc')
    // measure the caret relative to the whole note, since the paste may leave the caret in a text node nested in it
    expect(await getCaretOffsetIn(note)).toBe('Sed Ipsum'.length)
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
    await tap(editableNodeHandleD, { y: 140 })

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
    await tap(editableNodeHandleD, { y: 140 })

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
    // Deliberately no scrollTo(0, 0): the keyboard makes Safari scroll the document so that scrollY tracks
    // visualViewport.offsetTop, and forcing scrollY back to 0 leaves the two desynchronised, which shifts the
    // page-to-screen offset by offsetTop and lands the tap below the thought.
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

  // https://github.com/cybersemics/em/issues/4220
  it('Tap moves the caret to a word a few characters away', async () => {
    const value = 'Hello beautiful people in the world'
    await newThought(value)
    const editable = await waitForEditable(value)
    await waitUntil(isKeyboardShown)

    // place the caret before "the"
    const offsetBeforeThe = 'Hello beautiful people in '.length
    await tap(editable, { offset: offsetBeforeThe, pointerType: 'touch' })
    await waitForCaretOffset(offsetBeforeThe)

    // tap the "i" of "in", four characters to the left of the caret
    const offsetBeforeIn = 'Hello beautiful people '.length
    await tap(editable, { offset: offsetBeforeIn, pointerType: 'touch' })
    await waitForCaretOffset(offsetBeforeIn)
  })

  // https://github.com/cybersemics/em/issues/6178
  it('Tap just below the line moves the caret to the tapped word, not the end of the thought', async () => {
    const value = 'Hello beautiful people in the world'
    await newThought(value)
    const editable = await waitForEditable(value)
    await waitUntil(isKeyboardShown)

    // place the caret before "world"
    const offsetBeforeWorld = 'Hello beautiful people in the '.length
    await tap(editable, { offset: offsetBeforeWorld, pointerType: 'touch' })
    await waitForCaretOffset(offsetBeforeWorld)

    // Tap the "h" of "the", three characters to the left of the caret, 1px below its line box, where iOS first moves
    // the caret to the end of the thought.
    const offsetInThe = 'Hello beautiful people in t'.length
    const lineHeight = await browser.execute((offset: number) => {
      const text = document.querySelector('[data-editing=true] [data-editable]')!.firstChild!
      const range = document.createRange()
      range.setStart(text, offset)
      range.setEnd(text, offset + 1)
      return range.getBoundingClientRect().height
    }, offsetInThe)
    await tap(editable, { offset: offsetInThe, y: lineHeight / 2 + 1, pointerType: 'touch' })

    // the tap rounds to the nearer end of "the"
    await waitForCaretOffset('Hello beautiful people in '.length)
  })

  // https://github.com/cybersemics/em/issues/4247
  it('Tap near the bottom edge of a non-cursor thought places the caret at the tapped word', async () => {
    const importText = `
    - A
      - Beyond the Planet Earth
        - =note
          - Tsiolovsky (1960)
        - B
      - A Memory Called Empire
        - =note
          - Arkady Martíne (2019)
        - C`
    await newThought()
    await paste([''], importText)
    await clickThought('A')

    // tap the "P" of "Planet", a little inside the glyph so that the tap does not land on the word boundary
    const beyond = await waitForEditable('Beyond the Planet Earth')
    await tap(beyond, { offset: 'Beyond the '.length, x: 3, pointerType: 'touch' })
    await waitUntil(async () => (await getEditingText()) === 'Beyond the Planet Earth')

    // Tap the bottom of the "C" of "Called", 7px below the middle of the line. The mousedown reaches the editable, but
    // the mouseup and click land on the thought annotation drawn over it, so a placement that waits for either is lost
    // and the caret goes to the start of the thought. Only about 5–7px below the middle does this on both iOS 26 and 27,
    // since farther down the tap lands on the note.
    const memory = await waitForEditable('A Memory Called Empire')
    const offsetBeforeCalled = 'A Memory '.length
    await tap(memory, { offset: offsetBeforeCalled, x: 3, y: 7, pointerType: 'touch' })

    await waitUntil(async () => (await getEditingText()) === 'A Memory Called Empire')
    await waitForCaretOffset(offsetBeforeCalled)
  })
})
