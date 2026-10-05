import store from '../../stores/app'
import initEvents from '../initEvents'

// The Android app is tested in its own file because initEvents registers its listeners once per module registry, so
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
beforeEach(() => {
  cleanup = initEvents(store).cleanup
})
afterEach(() => cleanup())

// https://github.com/cybersemics/em/issues/4225
it.skip('dismisses the selection menu during a native drag of selected text', () => {
  const editable = document.createElement('div')
  editable.setAttribute('contenteditable', 'true')
  editable.textContent = 'Sed et fringilla lacus'
  document.body.appendChild(editable)

  // select a word, as a double tap does
  const range = document.createRange()
  range.setStart(editable.firstChild!, 7)
  range.setEnd(editable.firstChild!, 16)
  window.getSelection()!.removeAllRanges()
  window.getSelection()!.addRange(range)

  // a long press on the selected word starts a native drag
  const dragStart = new Event('dragstart', { bubbles: true, cancelable: true })
  editable.dispatchEvent(dragStart)

  // the native drag goes ahead
  expect(dragStart.defaultPrevented).toBe(false)

  // the selection menu is shown only for a ranged selection, so the selection is collapsed while dragging
  expect(window.getSelection()!.isCollapsed).toBe(true)

  // dropping restores the dragged word's selection, so the browser moves it rather than copying it
  editable.dispatchEvent(new Event('drop', { bubbles: true, cancelable: true }))
  expect(window.getSelection()!.toString()).toBe('fringilla')

  editable.remove()
})
