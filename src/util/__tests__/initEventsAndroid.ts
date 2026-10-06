import store from '../../stores/app'
import nativeTextDragCaretStore from '../../stores/nativeTextDragCaretStore'
import initEvents from '../initEvents'

// Android is tested in its own file because initEvents registers its listeners once per module registry, so
// the platform must be mocked before the single registration.
vi.mock('@capacitor/core', async importOriginal => {
  const actual = await importOriginal<typeof import('@capacitor/core')>()
  return {
    ...actual,
    Capacitor: {
      ...actual.Capacitor,
      getPlatform: () => 'android',
      isNativePlatform: () => true,
      isPluginAvailable: () => true,
    },
  }
})

vi.mock('@capacitor/keyboard', () => ({
  Keyboard: {
    addListener: () => Promise.resolve({ remove: () => {} }),
    hide: () => Promise.resolve(),
    removeAllListeners: () => Promise.resolve(),
    show: () => Promise.resolve(),
  },
}))

let cleanup: () => void
let editable: HTMLElement
beforeEach(() => {
  vi.useFakeTimers()
  cleanup = initEvents(store).cleanup

  editable = document.createElement('div')
  editable.setAttribute('contenteditable', 'true')
  editable.textContent = 'Sed et fringilla lacus'
  document.body.appendChild(editable)
})
afterEach(() => {
  cleanup()
  editable.remove()
  vi.useRealTimers()
})

/** Selects the given word in the editable, as a double tap does. */
const selectWord = (word: string) => {
  const start = editable.textContent!.indexOf(word)
  const range = document.createRange()
  range.setStart(editable.firstChild!, start)
  range.setEnd(editable.firstChild!, start + word.length)
  window.getSelection()!.removeAllRanges()
  window.getSelection()!.addRange(range)
}

/**
 * Lays out the editable for document.caretRangeFromPoint, which JSDOM does not implement, with the caret before the
 * given word on the line at y 50–70.
 */
const layOutCaretBefore = (word: string) => {
  Object.defineProperty(document, 'caretRangeFromPoint', {
    configurable: true,
    value: (x: number, y: number) => {
      if (y < 50 || y > 70) return null
      const range = document.createRange()
      range.setStart(editable.firstChild!, editable.textContent!.indexOf(word))
      return Object.assign(range, { getBoundingClientRect: () => new DOMRect(x, 50, 0, 20) })
    },
  })
  onTestFinished(() => {
    delete (document as { caretRangeFromPoint?: unknown }).caretRangeFromPoint
  })
}

// https://github.com/cybersemics/em/issues/4225
it('dismisses the selection menu during a native drag of selected text', async () => {
  selectWord('fringilla')

  // a long press on the selected word starts a native drag
  const dragStart = new Event('dragstart', { bubbles: true, cancelable: true })
  editable.firstChild!.dispatchEvent(dragStart)

  // the native drag goes ahead, with the selection intact for the drag image the WebView takes after dragstart
  expect(dragStart.defaultPrevented).toBe(false)
  expect(window.getSelection()!.toString()).toBe('fringilla')

  // the selection menu is shown only for a ranged selection, so the selection is collapsed while dragging
  await vi.runAllTimersAsync()
  expect(window.getSelection()!.isCollapsed).toBe(true)

  // the native caret is hidden while dragging
  expect(document.body.dataset.nativeTextDrag).toBe('true')
})

// https://github.com/cybersemics/em/issues/4225
it('drags selected text with an opaque drag image of the text', async () => {
  selectWord('fringilla')

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

  await vi.runAllTimersAsync()
  expect(image.isConnected).toBe(false)
})

// https://github.com/cybersemics/em/issues/4225
it('does not let the long press context menu interrupt a native drag of selected text', () => {
  selectWord('fringilla')
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
  layOutCaretBefore('lacus')
  // JSDOM does not implement editing commands, so apply them to the selection as the browser does
  vi.spyOn(document, 'execCommand').mockImplementation((command, showUI, value) => {
    const range = window.getSelection()!.getRangeAt(0)
    if (command === 'delete') range.deleteContents()
    if (command === 'insertHTML') range.insertNode(range.createContextualFragment(value!))
    return true
  })

  selectWord('fringilla')
  editable.firstChild!.dispatchEvent(new Event('dragstart', { bubbles: true, cancelable: true }))
  await vi.runAllTimersAsync()

  // the finger is below the line, so the drop caret is drawn on the line above it
  const dragOver = new MouseEvent('dragover', { bubbles: true, cancelable: true, clientX: 30, clientY: 100 })
  editable.dispatchEvent(dragOver)

  // canceling dragover clears the WebView's own drop caret under the finger
  expect(dragOver.defaultPrevented).toBe(true)
  expect(nativeTextDragCaretStore.getState()).toEqual({ x: 30, y: 50, height: 20 })

  const drop = new MouseEvent('drop', { bubbles: true, cancelable: true, clientX: 30, clientY: 100 })
  editable.dispatchEvent(drop)
  editable.dispatchEvent(new Event('dragend', { bubbles: true }))

  // like the native drop, the dragged text is moved as is, without adjusting the spaces around it
  expect(drop.defaultPrevented).toBe(true)
  expect(editable.textContent).toBe('Sed et  fringillalacus')
  expect(nativeTextDragCaretStore.getState()).toBeNull()
  expect(document.body.dataset.nativeTextDrag).toBeUndefined()
})

// https://github.com/cybersemics/em/issues/4225
it('reselects dragged text when the drag ends without a drop', async () => {
  selectWord('fringilla')
  editable.firstChild!.dispatchEvent(new Event('dragstart', { bubbles: true, cancelable: true }))
  await vi.runAllTimersAsync()

  editable.dispatchEvent(new Event('dragend', { bubbles: true }))

  expect(window.getSelection()!.toString()).toBe('fringilla')
  expect(document.body.dataset.nativeTextDrag).toBeUndefined()
})
