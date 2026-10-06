import store from '../../stores/app'
import nativeTextDragCaretStore from '../../stores/nativeTextDragCaretStore'
import initEvents from '../initEvents'

// Android Chrome is tested in its own file because initEvents registers its listeners once per module registry, and
// the platform is read from the user agent when the browser module loads, so it must be set before any import.
vi.hoisted(() => {
  Object.defineProperty(navigator, 'userAgent', {
    configurable: true,
    value:
      'Mozilla/5.0 (Linux; Android 16; SM-A566B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36',
  })
})

let cleanup: () => void
let editable: HTMLElement
beforeEach(() => {
  vi.useFakeTimers()
  cleanup = initEvents(store).cleanup

  editable = document.createElement('div')
  editable.setAttribute('contenteditable', 'true')
  editable.textContent = 'Sed et fringilla lacus'
  document.body.appendChild(editable)

  // JSDOM does not implement document.caretRangeFromPoint, so lay out the caret before "lacus" on the line at y 50–70
  Object.defineProperty(document, 'caretRangeFromPoint', {
    configurable: true,
    value: (x: number, y: number) => {
      if (y < 50 || y > 70) return null
      const range = document.createRange()
      range.setStart(editable.firstChild!, editable.textContent!.indexOf('lacus'))
      return Object.assign(range, { getBoundingClientRect: () => new DOMRect(x, 50, 0, 20) })
    },
  })
})
afterEach(() => {
  cleanup()
  editable.remove()
  delete (document as { caretRangeFromPoint?: unknown }).caretRangeFromPoint
  vi.useRealTimers()
})

// https://github.com/cybersemics/em/issues/4225
it('draws a single drop caret above the finger during a native drag of selected text in Android Chrome', async () => {
  const start = editable.textContent!.indexOf('fringilla')
  const range = document.createRange()
  range.setStart(editable.firstChild!, start)
  range.setEnd(editable.firstChild!, start + 'fringilla'.length)
  window.getSelection()!.removeAllRanges()
  window.getSelection()!.addRange(range)

  editable.firstChild!.dispatchEvent(new Event('dragstart', { bubbles: true, cancelable: true }))
  await vi.runAllTimersAsync()

  const dragOver = new MouseEvent('dragover', { bubbles: true, cancelable: true, clientX: 30, clientY: 100 })
  editable.dispatchEvent(dragOver)

  expect(dragOver.defaultPrevented).toBe(true)
  expect(nativeTextDragCaretStore.getState()).toEqual({ x: 30, y: 50, height: 20 })
  expect(document.body.dataset.nativeTextDrag).toBe('true')

  editable.dispatchEvent(new Event('dragend', { bubbles: true }))
})
