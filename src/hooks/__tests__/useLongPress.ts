import { fireEvent, screen } from '@testing-library/react'
import { act } from 'react'
import { importTextActionCreator as importText } from '../../actions/importText'
import { AlertText, TIMEOUT_LONG_PRESS_THOUGHT } from '../../constants'
import * as selection from '../../device/selection'
import hasMulticursor from '../../selectors/hasMulticursor'
import store from '../../stores/app'
import createTestApp, { cleanupTestApp } from '../../test-helpers/createTestApp'
import dispatch from '../../test-helpers/dispatch'
import findThoughtByText from '../../test-helpers/queries/findThoughtByText'
import getBulletByContext from '../../test-helpers/queries/getBulletByContext'

/*
  After a double tap on the caret, iOS 27 stops dispatching touchend when a later tap that leaves the caret where it is
  lifts, and dispatches it immediately before the next touchstart instead (#5660). The tap looks exactly like a finger
  held down, so without a guard it reaches the long press delay and activates drag and drop.

  On a touch device the whole thought takes a long press. JSDOM runs as desktop, where only the bullet does, so the
  touches land on the bullet. JSDOM also has no layout, so the browser's hit test, which says which word is under the
  finger, is supplied by the test.
*/

// Emulate Safari on iOS 27, where the press ends on the mouseup at the lift when the touchend is withheld.
vi.mock('../../browser', async importOriginal => {
  const actual = await importOriginal<typeof import('../../browser')>()
  return { ...actual, isSafari27OrLater: true }
})

let caretRangeFromPoint: Document['caretRangeFromPoint'] | undefined

beforeEach(async () => {
  await createTestApp()
  caretRangeFromPoint = document.caretRangeFromPoint
})

afterEach(async () => {
  document.caretRangeFromPoint = caretRangeFromPoint!
  sessionStorage.clear()
  await cleanupTestApp()
})

/** Makes every touch land on the given text, at the given offset. */
const touchesLandOn = async (text: string, offset: number) => {
  const textNode = (await findThoughtByText(text))!.firstChild!
  document.caretRangeFromPoint = () => {
    const range = document.createRange()
    range.setStart(textNode, offset)
    return range
  }
}

/** Starts a touch on an element. */
const touchStart = (el: HTMLElement) =>
  act(async () => {
    fireEvent.touchStart(el, { touches: [{ clientX: 0, clientY: 0 }], changedTouches: [{ clientX: 0, clientY: 0 }] })
  })

/** Touches an element, lifting the finger after the given number of milliseconds. */
const tap = async (el: HTMLElement, { hold = 50 }: { hold?: number } = {}) => {
  await touchStart(el)
  await act(() => vi.advanceTimersByTimeAsync(hold))
  await act(async () => {
    fireEvent.touchEnd(el)
  })
}

it('a tap on the caret after a double tap does not activate drag and drop', async () => {
  await dispatch(importText({ text: '- One' }))
  await act(vi.runOnlyPendingTimersAsync)
  const bullet = getBulletByContext(['One'])
  selection.set(await findThoughtByText('One'), { offset: 3 })
  await touchesLandOn('One', 3)

  // double tap
  await tap(bullet)
  await act(() => vi.advanceTimersByTimeAsync(50))
  await tap(bullet)
  await act(() => vi.advanceTimersByTimeAsync(1000))

  // the tap whose touchend iOS withholds
  await touchStart(bullet)
  await act(() => vi.advanceTimersByTimeAsync(TIMEOUT_LONG_PRESS_THOUGHT + 100))

  expect(screen.queryByText(AlertText.DragAndDrop)).toBeNull()
})

it('taps on the caret keep not activating drag and drop after taps elsewhere', async () => {
  await dispatch(importText({ text: '- One\n- Two' }))
  await act(vi.runOnlyPendingTimersAsync)
  const bullet = getBulletByContext(['One'])
  selection.set(await findThoughtByText('One'), { offset: 3 })
  await touchesLandOn('One', 3)

  // double tap
  await tap(bullet)
  await act(() => vi.advanceTimersByTimeAsync(50))
  await tap(bullet)
  await act(() => vi.advanceTimersByTimeAsync(1000))

  // a tap on the caret, whose touchend iOS withholds until the next touchstart
  await touchStart(bullet)
  await act(() => vi.advanceTimersByTimeAsync(1000))
  await act(async () => {
    fireEvent.touchEnd(bullet)
  })

  // a tap on another thought, which iOS delivers on time
  await touchesLandOn('Two', 1)
  await tap(bullet)
  await act(() => vi.advanceTimersByTimeAsync(1000))

  // another tap on the caret, whose touchend iOS withholds again
  await touchesLandOn('One', 3)
  await touchStart(bullet)
  await act(() => vi.advanceTimersByTimeAsync(TIMEOUT_LONG_PRESS_THOUGHT + 100))

  expect(screen.queryByText(AlertText.DragAndDrop)).toBeNull()
  // ending a false long press toggles the multicursor, which opens the Command Center
  expect(hasMulticursor(store.getState())).toBe(false)
})

it('a quick second tap on another thought does not activate drag and drop', async () => {
  await dispatch(importText({ text: '- One\n- Two' }))
  await act(vi.runOnlyPendingTimersAsync)
  const bullet = getBulletByContext(['Two'])
  selection.set(await findThoughtByText('One'), { offset: 3 })
  await touchesLandOn('Two', 1)

  // a tap, then a second touch 130ms after it lifts, whose touchend iOS withholds
  await tap(bullet, { hold: 90 })
  await act(() => vi.advanceTimersByTimeAsync(130))
  await touchStart(bullet)
  await act(() => vi.advanceTimersByTimeAsync(TIMEOUT_LONG_PRESS_THOUGHT + 100))

  expect(screen.queryByText(AlertText.DragAndDrop)).toBeNull()
})

it('a tap on the caret after a reload does not activate drag and drop once iOS has withheld a touchend', async () => {
  await dispatch(importText({ text: '- One' }))
  await act(vi.runOnlyPendingTimersAsync)
  const bullet = getBulletByContext(['One'])
  selection.set(await findThoughtByText('One'), { offset: 3 })
  await touchesLandOn('One', 3)
  // what an earlier page in this tab recorded before the reload
  sessionStorage.setItem('touchEndWithheld', 'true')

  await touchStart(bullet)
  await act(() => vi.advanceTimersByTimeAsync(TIMEOUT_LONG_PRESS_THOUGHT + 100))

  expect(screen.queryByText(AlertText.DragAndDrop)).toBeNull()
})

it('a long press on another thought more than 500ms after a double tap activates drag and drop', async () => {
  await dispatch(importText({ text: '- One\n- Two' }))
  await act(vi.runOnlyPendingTimersAsync)
  const bullet = getBulletByContext(['One'])
  selection.set(await findThoughtByText('One'), { offset: 3 })
  await touchesLandOn('One', 3)

  // double tap
  await tap(bullet)
  await act(() => vi.advanceTimersByTimeAsync(50))
  await tap(bullet)
  await act(() => vi.advanceTimersByTimeAsync(1000))

  // long press on another thought
  await touchesLandOn('Two', 1)
  await touchStart(bullet)
  await act(() => vi.advanceTimersByTimeAsync(TIMEOUT_LONG_PRESS_THOUGHT + 100))

  expect(screen.queryByText(AlertText.DragAndDrop)).not.toBeNull()
})

it('a tap on another thought after a double tap does not activate drag and drop when iOS withholds its touchend', async () => {
  await dispatch(importText({ text: '- One\n- Two' }))
  await act(vi.runOnlyPendingTimersAsync)
  const bullet = getBulletByContext(['One'])
  selection.set(await findThoughtByText('One'), { offset: 3 })
  await touchesLandOn('One', 3)

  // double tap, whose second touchend iOS withholds
  await tap(bullet)
  await act(() => vi.advanceTimersByTimeAsync(50))
  await touchStart(bullet)
  await act(() => vi.advanceTimersByTimeAsync(1000))

  // a tap on another thought, which flushes the withheld touchend in the same instant: iOS fires mouseup when the
  // finger lifts, but withholds the touchend again
  await touchesLandOn('Two', 1)
  await act(async () => {
    fireEvent.touchEnd(bullet)
  })
  await touchStart(bullet)
  await act(() => vi.advanceTimersByTimeAsync(100))
  await act(async () => {
    // iOS retargets the mouse events of a rapid tap to another element
    fireEvent.mouseUp(document.body)
  })
  await act(() => vi.advanceTimersByTimeAsync(TIMEOUT_LONG_PRESS_THOUGHT + 100))

  expect(screen.queryByText(AlertText.DragAndDrop)).toBeNull()
})

it('a long press ends when the finger lifts even if iOS withholds its touchend', async () => {
  await dispatch(importText({ text: '- One\n- Two' }))
  await act(vi.runOnlyPendingTimersAsync)
  const bullet = getBulletByContext(['One'])
  selection.set(await findThoughtByText('One'), { offset: 3 })
  await touchesLandOn('One', 3)

  // double tap, whose second touchend iOS withholds
  await tap(bullet)
  await act(() => vi.advanceTimersByTimeAsync(50))
  await touchStart(bullet)
  await act(() => vi.advanceTimersByTimeAsync(1000))

  // a long press on another thought, which flushes the withheld touchend in the same instant: iOS fires mouseup when
  // the finger lifts, but withholds the touchend again
  await touchesLandOn('Two', 1)
  await act(async () => {
    fireEvent.touchEnd(bullet)
  })
  await touchStart(bullet)
  await act(() => vi.advanceTimersByTimeAsync(TIMEOUT_LONG_PRESS_THOUGHT + 100))
  await act(async () => {
    // iOS retargets the mouse events of a rapid tap to another element
    fireEvent.mouseUp(document.body)
  })
  await act(() => vi.advanceTimersByTimeAsync(100))

  expect(screen.queryByText(AlertText.DragAndDrop)).toBeNull()
  // releasing a long press selects the thought
  expect(hasMulticursor(store.getState())).toBe(true)
})

it('a long press away from the caret activates drag and drop once iOS is stuck', async () => {
  await dispatch(importText({ text: '- One\n- Two' }))
  await act(vi.runOnlyPendingTimersAsync)
  const bullet = getBulletByContext(['One'])
  selection.set(await findThoughtByText('One'), { offset: 3 })
  await touchesLandOn('One', 3)

  // double tap
  await tap(bullet)
  await act(() => vi.advanceTimersByTimeAsync(50))
  await tap(bullet)
  await act(() => vi.advanceTimersByTimeAsync(1000))

  // a tap on the caret, whose touchend iOS withholds until the next touchstart
  await touchStart(bullet)
  await act(() => vi.advanceTimersByTimeAsync(1000))
  await act(async () => {
    fireEvent.touchEnd(bullet)
  })

  // long press on another thought
  await touchesLandOn('Two', 1)
  await touchStart(bullet)
  await act(() => vi.advanceTimersByTimeAsync(TIMEOUT_LONG_PRESS_THOUGHT + 100))

  expect(screen.queryByText(AlertText.DragAndDrop)).not.toBeNull()
})
