import { renderHook } from '@testing-library/react'
import { act } from 'react'
import * as selection from '../../../device/selection'
import dispatchTouchEvent from '../../../test-helpers/dispatchTouchEvent'
import initStore from '../../../test-helpers/initStore'
import layOutText from '../../../test-helpers/layOutText'
import useRevertCorrection from '../useRevertCorrection'

// The correction runs only on iOS Safari.
vi.mock('../../../browser', async importOriginal => {
  const actual = await importOriginal<typeof import('../../../browser')>()
  return { ...actual, isTouch: true, isSafari: () => true }
})

beforeEach(initStore)

// https://github.com/cybersemics/em/issues/4220
it('keeps the caret where a tap landed while iOS moves the caret', async () => {
  const value = 'Hello beautiful people in the world'
  const editable = document.createElement('div')
  editable.setAttribute('contenteditable', 'true')
  editable.setAttribute('data-editable', '')
  editable.appendChild(document.createTextNode(value))
  document.body.appendChild(editable)

  layOutText()

  // What Editable does with the recorded offset is covered by the Puppeteer and iOS tap tests.
  const recordCaretOffset = vi.fn()
  renderHook(() => useRevertCorrection({ editableRef: { current: editable }, enabled: true, recordCaretOffset }))
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

  // the tapped offset is recorded at the touchend, and then iOS places the caret at the tapped word and moves it back
  // to where it was (#4220)
  tapAt(offsetBeforeIn)
  expect(recordCaretOffset).toHaveBeenLastCalledWith(offsetBeforeIn)
  moveCaretTo(offsetBeforeIn)
  moveCaretTo(offsetBeforeThe)
  expect(selection.offsetFromNode(editable)).toBe(offsetBeforeIn)

  // after the move back, a move that iOS does not make, such as the space bar scrub, ends the watch
  moveCaretTo(offsetBeforeIn - 1)
  moveCaretTo(0)
  expect(selection.offsetFromNode(editable)).toBe(0)

  // a tap above the line first jumps to the start of the thought (#6178), and a move back after it is put back too
  moveCaretTo(offsetBeforeThe)
  tapAt(offsetAfterHello, 1)
  expect(recordCaretOffset).toHaveBeenLastCalledWith(offsetAfterHello)
  moveCaretTo(0)
  expect(selection.offsetFromNode(editable)).toBe(offsetAfterHello)
  moveCaretTo(offsetBeforeThe)
  expect(selection.offsetFromNode(editable)).toBe(offsetAfterHello)

  // iOS can place the caret at the other end of the tapped word than getCaretOffset, which is recorded and kept instead
  tapAt(offsetBeforeThe)
  expect(recordCaretOffset).toHaveBeenLastCalledWith(offsetBeforeThe)
  moveCaretTo(offsetAfterThe)
  expect(recordCaretOffset).toHaveBeenLastCalledWith(offsetAfterThe)
  expect(selection.offsetFromNode(editable)).toBe(offsetAfterThe)
  moveCaretTo(offsetAfterHello)
  expect(selection.offsetFromNode(editable)).toBe(offsetAfterThe)

  // a tap below the line first jumps to the end of the thought, and the put-back's own selectionchange, which a device
  // may or may not deliver, is not taken for iOS's placement, so the placement at the other end of the word is still
  // recorded and kept
  moveCaretTo(offsetBeforeIn)
  tapAt(offsetBeforeThe, 19)
  expect(recordCaretOffset).toHaveBeenLastCalledWith(offsetBeforeThe)
  moveCaretTo(value.length)
  expect(selection.offsetFromNode(editable)).toBe(offsetBeforeThe)
  act(() => {
    document.dispatchEvent(new Event('selectionchange'))
  })
  moveCaretTo(offsetAfterThe)
  expect(recordCaretOffset).toHaveBeenLastCalledWith(offsetAfterThe)
  moveCaretTo(offsetBeforeIn)
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

  // the next touch, such as the second of a double tap, ends the watch, so a move back to the old offset after it is
  // left alone
  moveCaretTo(offsetBeforeThe)
  tapAt(offsetBeforeIn)
  act(() => {
    dispatchTouchEvent('touchstart', [{ identifier: 0, clientX: offsetBeforeIn * 10 + 2, clientY: 10 }], {
      target: editable,
    })
  })
  moveCaretTo(offsetBeforeThe)
  expect(selection.offsetFromNode(editable)).toBe(offsetBeforeThe)
})
