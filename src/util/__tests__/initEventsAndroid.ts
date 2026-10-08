import { act } from 'react'
import { importTextActionCreator as importText } from '../../actions/importText'
import { undoActionCreator as undo } from '../../actions/undo'
import { HOME_TOKEN } from '../../constants'
import exportContext from '../../selectors/exportContext'
import { getChildrenRanked } from '../../selectors/getChildren'
import store from '../../stores/app'
import nativeTextDragCaretStore from '../../stores/nativeTextDragCaretStore'
import createTestApp, { cleanupTestApp } from '../../test-helpers/createTestApp'
import selectRange from '../../test-helpers/selectRange'

// Android is tested in its own file because the platform is read from the user agent when the browser module loads,
// so it must be set before any import. The native text drag handlers are gated on isAndroid, which is true for both
// Android browsers and the Android app, so an Android Chrome user agent covers both.
vi.hoisted(() => {
  Object.defineProperty(navigator, 'userAgent', {
    configurable: true,
    value:
      'Mozilla/5.0 (Linux; Android 16; SM-A566B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36',
  })
})

beforeEach(createTestApp)
afterEach(cleanupTestApp)

/** Imports the given outline into the home context. */
const importOutline = async (text: string) => {
  act(() => {
    store.dispatch(importText({ text }))
  })
  await act(vi.runOnlyPendingTimersAsync)
}

/** Returns the editable of the thought with the given text, which may be split by formatting. */
const getEditable = (text: string) => {
  const editable = [...document.querySelectorAll<HTMLElement>('[data-editable]')].find(
    editable => editable.textContent === text,
  )
  if (!editable) throw new Error(`No editable with the text "${text}"`)
  return editable
}

/** Selects the given word in the editable, as a double tap does. */
const selectWord = (editable: HTMLElement, word: string) => {
  const start = editable.textContent!.indexOf(word)
  selectRange(editable, start, start + word.length)
}

/**
 * Lays out the editable for document.caretRangeFromPoint, which JSDOM does not implement, with the caret before the
 * given word on the line at y 50–70.
 */
const layOutCaretBefore = (editable: HTMLElement, word: string) => {
  Object.defineProperty(document, 'caretRangeFromPoint', {
    configurable: true,
    value: (x: number, y: number) => {
      if (y < 50 || y > 70) return null
      const text = editable.firstChild!
      const range = document.createRange()
      range.setStart(text, text.textContent!.indexOf(word))
      return Object.assign(range, { getBoundingClientRect: () => new DOMRect(x, 50, 0, 20) })
    },
  })
  onTestFinished(() => {
    delete (document as { caretRangeFromPoint?: unknown }).caretRangeFromPoint
  })
}

/** Long presses the selected text in the editable until a native drag starts. Returns the dragstart event. */
const startDrag = async (editable: HTMLElement) => {
  const dragStart = new Event('dragstart', { bubbles: true, cancelable: true })
  editable.firstChild!.dispatchEvent(dragStart)
  await act(vi.runOnlyPendingTimersAsync)
  return dragStart
}

/** Drags to a finger 40px below the drop caret laid out by layOutCaretBefore, and lifts it. */
const dropBelowCaret = async (editable: HTMLElement) => {
  const finger = { bubbles: true, cancelable: true, clientX: 30, clientY: 100 }
  const drop = new MouseEvent('drop', finger)
  act(() => {
    editable.dispatchEvent(new MouseEvent('dragover', finger))
    editable.dispatchEvent(drop)
    editable.dispatchEvent(new Event('dragend', { bubbles: true }))
  })
  await act(vi.runOnlyPendingTimersAsync)
  return drop
}

// https://github.com/cybersemics/em/issues/4225
it('dismisses the selection menu during a native drag of selected text', async () => {
  await importOutline('- Sed et fringilla lacus')
  const editable = getEditable('Sed et fringilla lacus')
  selectWord(editable, 'fringilla')

  // a long press on the selected word starts a native drag
  const dragStart = new Event('dragstart', { bubbles: true, cancelable: true })
  editable.firstChild!.dispatchEvent(dragStart)

  // the native drag goes ahead, with the selection intact for the drag image the browser takes after dragstart
  expect(dragStart.defaultPrevented).toBe(false)
  expect(window.getSelection()!.toString()).toBe('fringilla')

  // the selection menu is shown only for a ranged selection, so the selection is collapsed while dragging
  await act(vi.runOnlyPendingTimersAsync)
  expect(window.getSelection()!.isCollapsed).toBe(true)

  // the native caret is hidden while dragging
  expect(document.body.dataset.nativeTextDrag).toBe('true')
})

// https://github.com/cybersemics/em/issues/4225
it('drags selected text with an opaque drag image of the text', async () => {
  await importOutline('- Sed et fringilla lacus')
  const editable = getEditable('Sed et fringilla lacus')
  selectWord(editable, 'fringilla')

  const setDragImage = vi.fn()
  const dragStart = new MouseEvent('dragstart', { bubbles: true, cancelable: true, clientX: 30, clientY: 10 })
  Object.assign(dragStart, { dataTransfer: { setDragImage } })
  editable.firstChild!.dispatchEvent(dragStart)

  // the image is laid out when the browser paints it after dragstart, with the finger where it was on the selected
  // text, which JSDOM lays out at the origin, offset by the image's border and padding
  const [image, x, y] = setDragImage.mock.calls[0]
  expect(image.textContent).toBe('fringilla')
  expect(image.isConnected).toBe(true)
  expect([x, y]).toEqual([35, 13])

  await act(vi.runOnlyPendingTimersAsync)
  expect(image.isConnected).toBe(false)
})

// https://github.com/cybersemics/em/issues/4225
it('does not let the long press context menu interrupt a native drag of selected text', async () => {
  await importOutline('- Sed et fringilla lacus')
  const editable = getEditable('Sed et fringilla lacus')
  selectWord(editable, 'fringilla')
  editable.firstChild!.dispatchEvent(new Event('dragstart', { bubbles: true, cancelable: true }))

  // em's long press handler, which blurs the editable and closes the keyboard, is not reached
  const onContextMenu = vi.fn()
  editable.addEventListener('contextmenu', onContextMenu)
  const contextMenu = new MouseEvent('contextmenu', { bubbles: true, cancelable: true })
  Object.assign(contextMenu, { pointerType: 'touch' })
  editable.dispatchEvent(contextMenu)

  expect(contextMenu.defaultPrevented).toBe(true)
  expect(onContextMenu).not.toHaveBeenCalled()
})

// https://github.com/cybersemics/em/issues/4225
it('moves dragged text to a single drop caret above the finger', async () => {
  await importOutline('- Sed et fringilla lacus')
  const editable = getEditable('Sed et fringilla lacus')
  layOutCaretBefore(editable, 'lacus')
  selectWord(editable, 'fringilla')
  await startDrag(editable)

  // the finger is below the line, so the drop caret is drawn on the line above it
  const dragOver = new MouseEvent('dragover', { bubbles: true, cancelable: true, clientX: 30, clientY: 100 })
  act(() => {
    editable.dispatchEvent(dragOver)
  })

  // canceling dragover clears the browser's own drop caret under the finger
  expect(dragOver.defaultPrevented).toBe(true)
  expect(nativeTextDragCaretStore.getState()).toEqual({ x: 30, y: 50, height: 20 })

  const drop = await dropBelowCaret(editable)

  // like the native drop, the dragged text is moved as is, without adjusting the spaces around it
  expect(drop.defaultPrevented).toBe(true)
  expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toBe(`- ${HOME_TOKEN}
  - Sed et  fringillalacus`)
  expect(nativeTextDragCaretStore.getState()).toBeNull()
  expect(document.body.dataset.nativeTextDrag).toBeUndefined()

  // a move within a thought is a single undo step
  act(() => {
    store.dispatch(undo())
  })
  await act(vi.runOnlyPendingTimersAsync)
  expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toBe(`- ${HOME_TOKEN}
  - Sed et fringilla lacus`)
})

// https://github.com/cybersemics/em/issues/4225
it('moves dragged text with its formatting into another thought', async () => {
  await importOutline(`- foo <b>bar</b> baz
- one two`)
  const source = getEditable('foo bar baz')
  const target = getEditable('one two')
  layOutCaretBefore(target, 'two')
  selectWord(source, 'bar')
  await startDrag(source)

  await dropBelowCaret(target)

  expect(getChildrenRanked(store.getState(), HOME_TOKEN).map(thought => thought.value)).toEqual([
    'foo  baz',
    'one <b>bar</b>two',
  ])
  act(() => {
    store.dispatch(undo())
  })
  await act(vi.runOnlyPendingTimersAsync)
  expect(getChildrenRanked(store.getState(), HOME_TOKEN).map(thought => thought.value)).toEqual([
    'foo <b>bar</b> baz',
    'one two',
  ])
})

// https://github.com/cybersemics/em/issues/4225
it('does not drop dragged text into a read-only thought', async () => {
  await importOutline(`- foo bar baz
- protected thought
  - =readonly`)
  const source = getEditable('foo bar baz')
  const target = getEditable('protected thought')
  layOutCaretBefore(target, 'thought')
  selectWord(source, 'bar')
  await startDrag(source)

  // there is no drop caret over the read-only thought
  act(() => {
    target.dispatchEvent(new MouseEvent('dragover', { bubbles: true, cancelable: true, clientX: 30, clientY: 100 }))
  })
  expect(nativeTextDragCaretStore.getState()).toBeNull()

  await dropBelowCaret(target)

  expect(exportContext(store.getState(), [HOME_TOKEN], 'text/plain')).toBe(`- ${HOME_TOKEN}
  - foo bar baz
  - protected thought
    - =readonly`)
  expect(target.textContent).toBe('protected thought')
  expect(store.getState().error).toBeNull()

  // the dragged text is reselected where it was
  expect(window.getSelection()!.toString()).toBe('bar')
})

// https://github.com/cybersemics/em/issues/4225
it('does not drag text out of a read-only thought', async () => {
  await importOutline(`- protected thought
  - =readonly`)
  const editable = getEditable('protected thought')
  selectWord(editable, 'thought')

  const dragStart = await startDrag(editable)

  expect(dragStart.defaultPrevented).toBe(true)
  expect(document.body.dataset.nativeTextDrag).toBeUndefined()
})

// https://github.com/cybersemics/em/issues/4225
it('reselects dragged text when the drag ends without a drop', async () => {
  await importOutline('- Sed et fringilla lacus')
  const editable = getEditable('Sed et fringilla lacus')
  selectWord(editable, 'fringilla')
  await startDrag(editable)

  editable.dispatchEvent(new Event('dragend', { bubbles: true }))

  expect(window.getSelection()!.toString()).toBe('fringilla')
  expect(document.body.dataset.nativeTextDrag).toBeUndefined()
})
