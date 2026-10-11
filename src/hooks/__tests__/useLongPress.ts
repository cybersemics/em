import { fireEvent, screen } from '@testing-library/react'
import { act } from 'react'
import { importTextActionCreator as importText } from '../../actions/importText'
import { AlertText, TIMEOUT_LONG_PRESS_THOUGHT } from '../../constants'
import hasMulticursor from '../../selectors/hasMulticursor'
import store from '../../stores/app'
import osVersionStore from '../../stores/osVersionStore'
import createTestApp, { cleanupTestApp } from '../../test-helpers/createTestApp'
import dispatch from '../../test-helpers/dispatch'
import getBulletByContext from '../../test-helpers/queries/getBulletByContext'

/*
  After a double tap on a focused editable, iOS 27 withholds the touchend of later touches until the next touch begins,
  but still fires mouseup when the finger lifts, retargeted on a rapid tap to another element (#5660). Without the
  mouseup, a withheld tap looks exactly like a finger held down and reaches the long press delay.

  On a touch device the whole thought takes a long press. JSDOM runs as desktop, where only the bullet does, so the
  touches land on the bullet.
*/

beforeEach(async () => {
  await createTestApp()
  osVersionStore.update(27)
})

afterEach(async () => {
  await cleanupTestApp()
})

/** Starts a touch on an element. */
const touchStart = (el: HTMLElement) =>
  act(async () => {
    fireEvent.touchStart(el, { touches: [{ clientX: 0, clientY: 0 }], changedTouches: [{ clientX: 0, clientY: 0 }] })
  })

/** Lifts the finger of a touch whose touchend iOS withholds, which delivers only the mouseup. */
const liftWithheld = () =>
  act(async () => {
    fireEvent.mouseUp(document.body)
  })

it('a tap whose touchend iOS withholds does not activate drag and drop', async () => {
  await dispatch(importText({ text: '- One' }))
  await act(vi.runOnlyPendingTimersAsync)
  const bullet = getBulletByContext(['One'])

  await touchStart(bullet)
  await act(() => vi.advanceTimersByTimeAsync(100))
  await liftWithheld()
  await act(() => vi.advanceTimersByTimeAsync(TIMEOUT_LONG_PRESS_THOUGHT + 100))

  expect(screen.queryByText(AlertText.DragAndDrop)).toBeNull()
})

it('a long press ends when the finger lifts even if iOS withholds its touchend', async () => {
  await dispatch(importText({ text: '- One' }))
  await act(vi.runOnlyPendingTimersAsync)
  const bullet = getBulletByContext(['One'])

  await touchStart(bullet)
  await act(() => vi.advanceTimersByTimeAsync(TIMEOUT_LONG_PRESS_THOUGHT + 100))
  expect(screen.queryByText(AlertText.DragAndDrop)).not.toBeNull()

  await liftWithheld()
  await act(() => vi.advanceTimersByTimeAsync(100))

  expect(screen.queryByText(AlertText.DragAndDrop)).toBeNull()
  // releasing a long press selects the thought
  expect(hasMulticursor(store.getState())).toBe(true)
})

it('a tap whose touchend and mouseup iOS withholds does not activate drag and drop once it moves the caret', async () => {
  await dispatch(importText({ text: '- One' }))
  await act(vi.runOnlyPendingTimersAsync)
  const bullet = getBulletByContext(['One'])

  await touchStart(bullet)
  await act(() => vi.advanceTimersByTimeAsync(100))
  await act(async () => {
    document.dispatchEvent(new Event('selectionchange'))
  })
  await act(() => vi.advanceTimersByTimeAsync(TIMEOUT_LONG_PRESS_THOUGHT + 100))

  expect(screen.queryByText(AlertText.DragAndDrop)).toBeNull()
})

it('a selection change after a long press begins does not end it', async () => {
  await dispatch(importText({ text: '- One' }))
  await act(vi.runOnlyPendingTimersAsync)
  const bullet = getBulletByContext(['One'])

  await touchStart(bullet)
  await act(() => vi.advanceTimersByTimeAsync(TIMEOUT_LONG_PRESS_THOUGHT + 100))
  // DragHold blurs the editable, which changes the selection
  await act(async () => {
    document.dispatchEvent(new Event('selectionchange'))
  })
  await act(() => vi.advanceTimersByTimeAsync(100))

  expect(screen.queryByText(AlertText.DragAndDrop)).not.toBeNull()
})

it('a mouseup does not end a touch press before WebKit 27', async () => {
  osVersionStore.update(26)
  await dispatch(importText({ text: '- One' }))
  await act(vi.runOnlyPendingTimersAsync)
  const bullet = getBulletByContext(['One'])

  await touchStart(bullet)
  await act(() => vi.advanceTimersByTimeAsync(100))
  await act(async () => {
    fireEvent.mouseUp(document.body)
  })
  await act(() => vi.advanceTimersByTimeAsync(TIMEOUT_LONG_PRESS_THOUGHT + 100))

  expect(screen.queryByText(AlertText.DragAndDrop)).not.toBeNull()
})
