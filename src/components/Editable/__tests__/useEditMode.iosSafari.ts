import { renderHook } from '@testing-library/react'
import { act, createElement } from 'react'
import { Provider } from 'react-redux'
import { importTextActionCreator as importText } from '../../../actions/importText'
import { keyboardOpenActionCreator as keyboardOpen } from '../../../actions/keyboardOpen'
import { setCursorActionCreator } from '../../../actions/setCursor'
import * as selection from '../../../device/selection'
import store from '../../../stores/app'
import touchStore from '../../../stores/touchStore'
import dispatchTouchEvent from '../../../test-helpers/dispatchTouchEvent'
import initStore from '../../../test-helpers/initStore'
import layOutText from '../../../test-helpers/layOutText'
import { setCursorFirstMatchActionCreator as setCursor } from '../../../test-helpers/setCursorFirstMatch'
import lastTouch from '../lastTouch'
import useEditMode from '../useEditMode'

// Emulate iOS Safari, which sometimes synthesizes the mousedown/focus of a tap even though touchend called
// preventDefault (e.g. a non-cancelable touchend during scroll momentum). See suppressCursorAfterTouch in stores/touchStore.ts.
vi.mock('../../../browser', async importOriginal => {
  const actual = await importOriginal<typeof import('../../../browser')>()
  return {
    ...actual,
    isTouch: true,
    isSafari: () => true,
  }
})

beforeEach(initStore)

// Deliberately first: it leaves a touchend recorded against its own editable, which is what the tests after it must
// not observe. https://github.com/cybersemics/em/issues/5252
it('record the touchend of a tap on a thought', () => {
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
        // No tap places a caret in this test.
        setCursorForTap: () => {},
        style: undefined,
        transient: undefined,
      }),
    { wrapper: ({ children }) => createElement(Provider, { store, children }) },
  )

  act(() => {
    editable.dispatchEvent(new TouchEvent('touchend', { bubbles: true, cancelable: true }))
  })

  expect(lastTouch.isRecent()).toBe(true)
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
        // No tap places a caret in this test.
        setCursorForTap: () => {},
        style: undefined,
        transient: undefined,
      }),
    { wrapper: ({ children }) => createElement(Provider, { store, children }) },
  )

  // The touchend of a tap on a non-cursor thought moved the cursor here without entering edit mode and flagged
  // the tap's synthesized trailing events for suppression (see Editable's handleTapBehavior). The cursor move
  // re-rendered this thought with editingOrOnCursor true before the mousedown arrived.
  touchStore.update({ suppressCursorAfterTouch: true })

  const mousedown = new MouseEvent('mousedown', { bubbles: true, cancelable: true })
  act(() => {
    editable.dispatchEvent(mousedown)
  })

  // preventDefault blocks the caret placement and focus that would otherwise treat the synthesized mousedown as
  // a second tap and open the keyboard
  expect(mousedown.defaultPrevented).toBe(true)
})

it('allow mousedown on the cursor thought when no cursor-moving tap preceded it', () => {
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
        // No tap places a caret in this test.
        setCursorForTap: () => {},
        style: undefined,
        transient: undefined,
      }),
    { wrapper: ({ children }) => createElement(Provider, { store, children }) },
  )

  const mousedown = new MouseEvent('mousedown', { bubbles: true, cancelable: true })
  act(() => {
    editable.dispatchEvent(mousedown)
  })

  expect(mousedown.defaultPrevented).toBe(false)
})

// https://github.com/cybersemics/em/issues/4220
it('keeps the caret where a tap landed while iOS moves the caret', async () => {
  const value = 'Hello beautiful people in the world'
  store.dispatch([importText({ text: `- ${value}` }), setCursor([value]), keyboardOpen({ value: true })])

  const editable = document.createElement('div')
  editable.setAttribute('contenteditable', 'true')
  editable.setAttribute('data-editable', '')
  editable.appendChild(document.createTextNode(value))
  document.body.appendChild(editable)

  layOutText()

  renderHook(
    () =>
      useEditMode({
        contentRef: { current: editable as unknown as HTMLInputElement },
        isEditing: true,
        path: store.getState().cursor!,
        // The hook is rendered on the cursor thought, where a tap only places the caret.
        setCursorForTap: ({ offset }) => {
          if (offset !== undefined)
            store.dispatch(setCursorActionCreator({ path: store.getState().cursor, offset, preserveMulticursor: true }))
        },
        style: undefined,
        transient: undefined,
      }),
    { wrapper: ({ children }) => createElement(Provider, { store, children }) },
  )
  act(() => editable.focus())
  await act(vi.runOnlyPendingTimersAsync)

  /** Moves the browser caret, as iOS does, and fires the selectionchange that the browser would fire. */
  const moveCaretTo = (offset: number) =>
    act(() => {
      selection.set(editable, { offset })
      document.dispatchEvent(new Event('selectionchange'))
    })

  const offsetBeforeThe = 'Hello beautiful people in '.length
  const offsetAfterThe = 'Hello beautiful people in the'.length
  const offsetBeforeIn = 'Hello beautiful people '.length
  const offsetAfterHello = 'Hello'.length

  /** Taps the given character offset at the given height, slowly enough that it gets no mouse events. */
  const tapAt = (offset: number, clientY = 10) => {
    const finger = { identifier: 0, clientX: offset * 10 + 2, clientY }
    act(() => {
      dispatchTouchEvent('touchstart', [finger], { target: editable })
      dispatchTouchEvent('touchend', [finger], { touches: [], target: editable })
    })
  }

  moveCaretTo(offsetBeforeThe)
  await act(vi.runOnlyPendingTimersAsync)

  // iOS places the caret at the tapped word, and then moves it back to where it was (#4220)
  tapAt(offsetBeforeIn)
  moveCaretTo(offsetBeforeIn)
  moveCaretTo(offsetBeforeThe)
  expect(selection.offsetFromNode(editable)).toBe(offsetBeforeIn)

  // iOS 27 can also extend the selection from the caret back to where it was
  act(() => {
    selection.setRange(editable, { start: offsetBeforeIn, end: offsetBeforeThe })
    document.dispatchEvent(new Event('selectionchange'))
  })
  expect(selection.isCollapsed()).toBe(true)
  expect(selection.offsetFromNode(editable)).toBe(offsetBeforeIn)

  // after the move back, a move that iOS does not make, such as the space bar scrub, ends the watch
  moveCaretTo(offsetBeforeIn - 1)
  moveCaretTo(0)
  expect(selection.offsetFromNode(editable)).toBe(0)

  // a tap above the line first jumps to the start of the thought (#6178), and a move back after it is put back too
  moveCaretTo(offsetBeforeThe)
  tapAt(offsetAfterHello, 1)
  moveCaretTo(0)
  expect(selection.offsetFromNode(editable)).toBe(offsetAfterHello)
  moveCaretTo(offsetBeforeThe)
  expect(selection.offsetFromNode(editable)).toBe(offsetAfterHello)

  // iOS can place the caret at the other end of the tapped word than getCaretOffset, which is kept instead
  tapAt(offsetBeforeThe)
  moveCaretTo(offsetAfterThe)
  expect(selection.offsetFromNode(editable)).toBe(offsetAfterThe)
  moveCaretTo(offsetAfterHello)
  expect(selection.offsetFromNode(editable)).toBe(offsetAfterThe)

  // iOS can pass through another offset on its way back
  tapAt(offsetBeforeIn)
  moveCaretTo(offsetBeforeIn)
  moveCaretTo(offsetBeforeIn + 2)
  expect(selection.offsetFromNode(editable)).toBe(offsetBeforeIn + 2)
  moveCaretTo(offsetAfterThe)
  expect(selection.offsetFromNode(editable)).toBe(offsetBeforeIn)

  // a tap on the caret leaves nothing to move back, so its watch ends on the first move, and the space bar scrub can go
  // on to the start of the thought
  tapAt(offsetBeforeIn)
  moveCaretTo(offsetBeforeIn - 1)
  moveCaretTo(0)
  expect(selection.offsetFromNode(editable)).toBe(0)

  // the second touch of a double tap ends the watch, so that its word selection stays
  moveCaretTo(offsetBeforeThe)
  tapAt(offsetBeforeIn)
  act(() => {
    dispatchTouchEvent('touchstart', [{ identifier: 0, clientX: offsetBeforeIn * 10 + 2, clientY: 10 }], {
      target: editable,
    })
    selection.setRange(editable, { start: offsetBeforeIn, end: offsetBeforeThe })
    document.dispatchEvent(new Event('selectionchange'))
  })
  expect(selection.isCollapsed()).toBe(false)
})
