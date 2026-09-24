import { fireEvent, screen } from '@testing-library/react'
import { act } from 'react'
import { importTextActionCreator as importText } from '../../actions/importText'
import { AlertText, TIMEOUT_LONG_PRESS_THOUGHT } from '../../constants'
import hasMulticursor from '../../selectors/hasMulticursor'
import store from '../../stores/app'
import createTestApp, { cleanupTestApp } from '../../test-helpers/createTestApp'
import dispatch from '../../test-helpers/dispatch'
import getBulletByContext from '../../test-helpers/queries/getBulletByContext'

beforeEach(createTestApp)
afterEach(cleanupTestApp)

/** Touches an element, lifting the finger after the given number of milliseconds. */
const tap = async (el: HTMLElement, { hold = 50 }: { hold?: number } = {}) => {
  await act(async () => {
    fireEvent.touchStart(el)
  })
  await act(() => vi.advanceTimersByTimeAsync(hold))
  await act(async () => {
    fireEvent.touchEnd(el)
  })
}

/*
  After a double tap on the caret, iOS 27 stops dispatching touchend when a later tap on the thought lifts, and
  dispatches it immediately before the next touchstart instead (#5660). The tap looks exactly like a finger held down,
  so without a guard it reaches the long press delay and activates drag and drop.

  On a touch device the whole thought takes a long press. JSDOM runs as desktop, where only the bullet does, so the
  touches land on the bullet.
*/

it('a tap after a double tap does not activate drag and drop', async () => {
  await dispatch(importText({ text: '- One' }))
  await act(vi.runOnlyPendingTimersAsync)
  const bullet = getBulletByContext(['One'])

  await tap(bullet)
  await act(() => vi.advanceTimersByTimeAsync(1000))

  // double tap
  await tap(bullet)
  await act(() => vi.advanceTimersByTimeAsync(50))
  await tap(bullet)
  await act(() => vi.advanceTimersByTimeAsync(1000))

  // the tap whose touchend iOS withholds
  await act(async () => {
    fireEvent.touchStart(bullet)
  })
  await act(() => vi.advanceTimersByTimeAsync(TIMEOUT_LONG_PRESS_THOUGHT + 100))

  expect(screen.queryByText(AlertText.DragAndDrop)).toBeNull()
})

it('later taps after a double tap do not activate drag and drop', async () => {
  await dispatch(importText({ text: '- One' }))
  await act(vi.runOnlyPendingTimersAsync)
  const bullet = getBulletByContext(['One'])

  // double tap
  await tap(bullet)
  await act(() => vi.advanceTimersByTimeAsync(50))
  await tap(bullet)
  await act(() => vi.advanceTimersByTimeAsync(1000))

  // the first tap whose touchend iOS withholds
  await act(async () => {
    fireEvent.touchStart(bullet)
  })
  await act(() => vi.advanceTimersByTimeAsync(1000))

  // iOS dispatches the withheld touchend immediately before the next touchstart, and withholds that tap's touchend too
  await act(async () => {
    fireEvent.touchEnd(bullet)
    fireEvent.touchStart(bullet)
  })
  await act(() => vi.advanceTimersByTimeAsync(TIMEOUT_LONG_PRESS_THOUGHT + 100))

  expect(screen.queryByText(AlertText.DragAndDrop)).toBeNull()
  // ending a false long press toggles the multicursor, which opens the Command Center
  expect(hasMulticursor(store.getState())).toBe(false)
})

it('a long press activates drag and drop once touchend is dispatched on time again', async () => {
  await dispatch(importText({ text: '- One' }))
  await act(vi.runOnlyPendingTimersAsync)
  const bullet = getBulletByContext(['One'])

  // double tap
  await tap(bullet)
  await act(() => vi.advanceTimersByTimeAsync(50))
  await tap(bullet)
  await act(() => vi.advanceTimersByTimeAsync(1000))

  // a tap whose touchend iOS withholds until the next touchstart
  await act(async () => {
    fireEvent.touchStart(bullet)
  })
  await act(() => vi.advanceTimersByTimeAsync(1000))
  await act(async () => {
    fireEvent.touchEnd(bullet)
  })

  // a tap whose touchend is dispatched when the finger lifts
  await tap(bullet)
  await act(() => vi.advanceTimersByTimeAsync(1000))

  // long press
  await act(async () => {
    fireEvent.touchStart(bullet)
  })
  await act(() => vi.advanceTimersByTimeAsync(TIMEOUT_LONG_PRESS_THOUGHT + 100))

  expect(screen.queryByText(AlertText.DragAndDrop)).not.toBeNull()
})
