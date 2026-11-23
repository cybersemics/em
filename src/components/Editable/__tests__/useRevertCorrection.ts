import { renderHook } from '@testing-library/react'
import { act } from 'react'
import { TIMEOUT_LONG_PRESS_THOUGHT, TOUCH_SLOP } from '../../../constants'
import getCaretOffset from '../../../device/getCaretOffset'
import * as selection from '../../../device/selection'
import dispatchTouchEvent from '../../../test-helpers/dispatchTouchEvent'
import useRevertCorrection from '../useRevertCorrection'

// Covers the hook's wiring around stepRevertWatch, whose phases have their own tests: which touches are taps, what
// ends the watch, and carrying out its steps.

// The correction runs only on iOS Safari.
vi.mock('../../../browser', async importOriginal => {
  const actual = await importOriginal<typeof import('../../../browser')>()
  return { ...actual, isTouch: true, isSafari: () => true }
})

// JSDOM lays out no text to hit-test a touch against, so the tapped offset is given instead.
vi.mock('../../../device/getCaretOffset', () => ({ default: vi.fn() }))

const value = 'Hello beautiful people in the world'
const offsetBeforeThe = 'Hello beautiful people in '.length
const offsetBeforeIn = 'Hello beautiful people '.length

/** Renders the hook on a focused editable with the caret before "the", with the tap resolving to before "in". */
const setup = ({ enabled = true }: { enabled?: boolean } = {}) => {
  const editable = document.createElement('div')
  editable.setAttribute('contenteditable', 'true')
  editable.appendChild(document.createTextNode(value))
  document.body.appendChild(editable)
  onTestFinished(() => editable.remove())

  vi.mocked(getCaretOffset).mockReturnValue({ offset: offsetBeforeIn } as ReturnType<typeof getCaretOffset>)
  const recordCaretOffset = vi.fn()
  renderHook(() => useRevertCorrection({ editableRef: { current: editable }, enabled, recordCaretOffset }))
  editable.focus()
  selection.set(editable, { offset: offsetBeforeThe })
  return { editable, recordCaretOffset }
}

/** Moves the caret as iOS does, and fires the selectionchange the browser would. */
const moveCaretTo = (editable: HTMLElement, offset: number) =>
  act(() => {
    selection.set(editable, { offset })
    document.dispatchEvent(new Event('selectionchange'))
  })

/** Touches the editable at x and lifts the finger at endX, holding it for heldMs. */
const touch = (editable: HTMLElement, { endX = 10, heldMs = 100 }: { endX?: number; heldMs?: number } = {}) => {
  const now = vi.spyOn(performance, 'now').mockReturnValue(1000)
  dispatchTouchEvent('touchstart', [{ identifier: 0, clientX: 10, clientY: 10 }], { target: editable })
  now.mockReturnValue(1000 + heldMs)
  dispatchTouchEvent('touchend', [{ identifier: 0, clientX: endX, clientY: 10 }], { touches: [], target: editable })
  now.mockRestore()
}

it('records the offset of a tap at its touchend', () => {
  const { editable, recordCaretOffset } = setup()
  touch(editable)
  expect(recordCaretOffset).toHaveBeenCalledExactlyOnceWith(offsetBeforeIn)
})

describe('does not record', () => {
  it('a drag', () => {
    const { editable, recordCaretOffset } = setup()
    touch(editable, { endX: 10 + TOUCH_SLOP + 1 })
    expect(recordCaretOffset).not.toHaveBeenCalled()
  })

  it('a long press, or a touchend iOS 27 withheld until the next touch', () => {
    const { editable, recordCaretOffset } = setup()
    touch(editable, { heldMs: TIMEOUT_LONG_PRESS_THOUGHT })
    expect(recordCaretOffset).not.toHaveBeenCalled()
  })

  it('a touch with a second finger still down', () => {
    const { editable, recordCaretOffset } = setup()
    const finger = { identifier: 0, clientX: 10, clientY: 10 }
    const otherFinger = { identifier: 1, clientX: 50, clientY: 10 }
    dispatchTouchEvent('touchstart', [finger], { target: editable })
    dispatchTouchEvent('touchend', [finger], { touches: [otherFinger], target: editable })
    expect(recordCaretOffset).not.toHaveBeenCalled()
  })

  it('a touch that ends with text selected', () => {
    const { editable, recordCaretOffset } = setup()
    selection.setRange(editable, { start: offsetBeforeIn, end: offsetBeforeThe })
    touch(editable)
    expect(recordCaretOffset).not.toHaveBeenCalled()
  })

  it('a touch while the editable does not have the focus', () => {
    const { editable, recordCaretOffset } = setup()
    editable.blur()
    touch(editable)
    expect(recordCaretOffset).not.toHaveBeenCalled()
  })

  it('a tap while the correction is disabled', () => {
    const { editable, recordCaretOffset } = setup({ enabled: false })
    touch(editable)
    expect(recordCaretOffset).not.toHaveBeenCalled()
  })
})

it("puts the caret back after iOS's move back, and records iOS's placement at the other end of the word", () => {
  const { editable, recordCaretOffset } = setup()
  touch(editable)

  // iOS places the caret at the other end of "in" from getCaretOffset's choice
  const offsetAfterIn = 'Hello beautiful people in'.length
  moveCaretTo(editable, offsetAfterIn)
  expect(recordCaretOffset).toHaveBeenLastCalledWith(offsetAfterIn)

  // and then moves it back to where it was before the tap
  moveCaretTo(editable, offsetBeforeThe)
  expect(selection.offsetFromNode(editable)).toBe(offsetAfterIn)
})

it('leaves a range to the browser, even one that starts where the caret was before the tap', () => {
  const { editable } = setup()
  touch(editable)
  act(() => {
    selection.setRange(editable, { start: offsetBeforeThe, end: 'Hello beautiful people in the'.length })
    document.dispatchEvent(new Event('selectionchange'))
  })
  expect(selection.isCollapsed()).toBe(false)
})

it.each([
  [
    'touchstart',
    () => {
      dispatchTouchEvent('touchstart', [{ identifier: 1, clientX: 50, clientY: 10 }])
    },
  ],
  [
    'mousedown',
    () => {
      document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    },
  ],
  [
    'keydown',
    () => {
      document.body.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'a' }))
    },
  ],
  [
    'beforeinput',
    () => {
      document.body.dispatchEvent(new InputEvent('beforeinput', { bubbles: true }))
    },
  ],
])('ends the watch on a %s, so a move back after it is left alone', (_type, input) => {
  const { editable } = setup()
  touch(editable)
  act(input)
  moveCaretTo(editable, offsetBeforeThe)
  expect(selection.offsetFromNode(editable)).toBe(offsetBeforeThe)
})
