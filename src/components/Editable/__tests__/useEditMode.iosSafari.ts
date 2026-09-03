import { renderHook } from '@testing-library/react'
import { act, createElement } from 'react'
import { Provider } from 'react-redux'
import { importTextActionCreator as importText } from '../../../actions/importText'
import globals from '../../../globals'
import store from '../../../stores/app'
import initStore from '../../../test-helpers/initStore'
import { setCursorFirstMatchActionCreator as setCursor } from '../../../test-helpers/setCursorFirstMatch'
import useEditMode from '../useEditMode'

// Emulate iOS Safari, which sometimes synthesizes the mousedown/focus of a tap even though touchend called
// preventDefault (e.g. a non-cancelable touchend during scroll momentum). See globals.suppressFocusAfterCursorMove.
vi.mock('../../../browser', async importOriginal => {
  const actual = await importOriginal<typeof import('../../../browser')>()
  return {
    ...actual,
    isTouch: true,
    isSafari: () => true,
  }
})

beforeEach(initStore)

afterEach(() => {
  globals.suppressFocusAfterCursorMove = false
})

it('suppress the synthesized mousedown of a tap that already moved the cursor without entering edit mode', () => {
  store.dispatch([importText({ text: '- a' }), setCursor(['a'])])

  const editable = document.createElement('div')
  editable.setAttribute('contenteditable', 'true')
  document.body.appendChild(editable)

  renderHook(
    () =>
      useEditMode({
        contentRef: { current: editable as unknown as HTMLInputElement },
        isEditing: true,
        path: store.getState().cursor!,
        style: undefined,
        transient: undefined,
      }),
    { wrapper: ({ children }) => createElement(Provider, { store, children }) },
  )

  // The touchend of a tap on a non-cursor thought moved the cursor here without entering edit mode and flagged
  // the tap's synthesized trailing events for suppression (see Editable's handleTapBehavior). The cursor move
  // re-rendered this thought with editingOrOnCursor true before the mousedown arrived.
  globals.suppressFocusAfterCursorMove = true

  const mousedown = new MouseEvent('mousedown', { bubbles: true, cancelable: true })
  act(() => {
    editable.dispatchEvent(mousedown)
  })

  // preventDefault blocks the caret placement and focus that would otherwise treat the synthesized mousedown as
  // a second tap and open the keyboard
  expect(mousedown.defaultPrevented).toBe(true)
})

// https://github.com/cybersemics/em/issues/3765
it('blocks native focus before placing the caret on the cursor thought', () => {
  store.dispatch([importText({ text: '- a' }), setCursor(['a'])])

  const editable = document.createElement('div')
  editable.setAttribute('contenteditable', 'true')
  document.body.appendChild(editable)

  renderHook(
    () =>
      useEditMode({
        contentRef: { current: editable as unknown as HTMLInputElement },
        isEditing: true,
        path: store.getState().cursor!,
        style: undefined,
        transient: undefined,
      }),
    { wrapper: ({ children }) => createElement(Provider, { store, children }) },
  )

  const mousedown = new MouseEvent('mousedown', { bubbles: true, cancelable: true })
  act(() => {
    editable.dispatchEvent(mousedown)
  })

  expect(mousedown.defaultPrevented).toBe(true)
  expect(document.activeElement).toBe(editable)
  expect(store.getState().cursorOffset).toBe(0)
})

// https://github.com/cybersemics/em/issues/3765
it('focuses a keyboard-closed cursor during touchend before blocking the synthesized mousedown', () => {
  store.dispatch([importText({ text: '- a' }), setCursor(['a'])])

  const editable = document.createElement('div')
  editable.setAttribute('contenteditable', 'true')
  editable.textContent = 'a'
  document.body.appendChild(editable)
  const focus = vi.spyOn(editable, 'focus')

  renderHook(
    () =>
      useEditMode({
        contentRef: { current: editable as unknown as HTMLInputElement },
        isEditing: true,
        path: store.getState().cursor!,
        style: undefined,
        transient: undefined,
      }),
    { wrapper: ({ children }) => createElement(Provider, { store, children }) },
  )

  const touchend = new Event('touchend', { bubbles: true, cancelable: true }) as TouchEvent
  Object.defineProperty(touchend, 'changedTouches', { value: [{ clientX: 0, clientY: 0 }] })

  act(() => {
    editable.dispatchEvent(touchend)
  })

  expect(focus).toHaveBeenCalledWith({ preventScroll: true })
})
