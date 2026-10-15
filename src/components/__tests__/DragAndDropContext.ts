import { fireEvent, screen } from '@testing-library/react'
import { act } from 'react'
import { importTextActionCreator as importText } from '../../actions/importText'
import { longPressActionCreator as longPress } from '../../actions/longPress'
import { AlertText, LongPressState, TIMEOUT_LONG_PRESS_THOUGHT } from '../../constants'
import hasMulticursor from '../../selectors/hasMulticursor'
import store from '../../stores/app'
import createTestApp, { cleanupTestApp } from '../../test-helpers/createTestApp'
import dispatch from '../../test-helpers/dispatch'
import getBulletByContext from '../../test-helpers/queries/getBulletByContext'

/*
  Drag and drop must never outlive the touch that started it (#5895). Each test leaves a press or drag active after
  every finger has lifted, by delivering the release where the pressed thought's own handlers cannot hear it, and
  expects it to end anyway.

  On a touch device the whole thought takes a long press. JSDOM runs as desktop, where only the bullet does, so the
  touches land on the bullet.
*/

beforeEach(createTestApp)
afterEach(cleanupTestApp)

/** Starts a touch on an element. */
const touchStart = (el: Element) =>
  act(async () => {
    fireEvent.touchStart(el, { touches: [{ clientX: 0, clientY: 0 }], changedTouches: [{ clientX: 0, clientY: 0 }] })
  })

/** Lifts the last finger outside the pressed thought, e.g. after the element it landed on was removed from the DOM. */
const liftElsewhere = () =>
  act(async () => {
    fireEvent.touchEnd(document.body, { touches: [], changedTouches: [{ clientX: 0, clientY: 0 }] })
  })

/** Returns true if the bullet of the given thought is highlighted, as it is during a long press. */
const isHighlighted = (context: string[]) => getBulletByContext(context).getAttribute('data-highlighted') === 'true'

it('a long press ends when the finger lifts, even if the thought never hears the release', async () => {
  await dispatch(importText({ text: '- One' }))
  await act(vi.runOnlyPendingTimersAsync)

  await touchStart(getBulletByContext(['One']))
  await act(() => vi.advanceTimersByTimeAsync(TIMEOUT_LONG_PRESS_THOUGHT + 100))
  expect(screen.queryByText(AlertText.DragAndDrop)).not.toBeNull()

  await liftElsewhere()
  await act(() => vi.advanceTimersByTimeAsync(1000))

  expect(screen.queryByText(AlertText.DragAndDrop)).toBeNull()
  expect(isHighlighted(['One'])).toBe(false)
  // the release was never seen, so it is not a deliberate long press and release, which would select the thought
  expect(hasMulticursor(store.getState())).toBe(false)
})

it('a long press whose release never arrives ends when the next touch begins', async () => {
  await dispatch(importText({ text: '- One' }))
  await act(vi.runOnlyPendingTimersAsync)

  await touchStart(getBulletByContext(['One']))
  await act(() => vi.advanceTimersByTimeAsync(TIMEOUT_LONG_PRESS_THOUGHT + 100))
  expect(screen.queryByText(AlertText.DragAndDrop)).not.toBeNull()

  // a single finger landing means every earlier finger has lifted
  await touchStart(document.body)
  await act(() => vi.advanceTimersByTimeAsync(1000))

  expect(screen.queryByText(AlertText.DragAndDrop)).toBeNull()
  expect(isHighlighted(['One'])).toBe(false)
  expect(hasMulticursor(store.getState())).toBe(false)
})

it('a thought whose long press was ended for it can be long pressed again', async () => {
  await dispatch(importText({ text: '- One' }))
  await act(vi.runOnlyPendingTimersAsync)
  const bullet = getBulletByContext(['One'])

  await touchStart(bullet)
  await act(() => vi.advanceTimersByTimeAsync(TIMEOUT_LONG_PRESS_THOUGHT + 100))
  await liftElsewhere()
  await act(() => vi.advanceTimersByTimeAsync(1000))
  expect(screen.queryByText(AlertText.DragAndDrop)).toBeNull()

  await touchStart(bullet)
  await act(() => vi.advanceTimersByTimeAsync(TIMEOUT_LONG_PRESS_THOUGHT + 100))

  expect(screen.queryByText(AlertText.DragAndDrop)).not.toBeNull()
  expect(isHighlighted(['One'])).toBe(true)
})

it('a drag ends when the last finger lifts, even if the drag never hears the release', async () => {
  await dispatch(importText({ text: '- One' }))
  await act(vi.runOnlyPendingTimersAsync)

  await touchStart(getBulletByContext(['One']))
  await act(() => vi.advanceTimersByTimeAsync(TIMEOUT_LONG_PRESS_THOUGHT + 100))
  // JSDOM runs the HTML5 backend, which a touch cannot move, so begin the drag as the touch backend would
  await dispatch(longPress({ value: LongPressState.DragInProgress, sourceZone: undefined }))
  expect(store.getState().longPress).toBe(LongPressState.DragInProgress)

  await liftElsewhere()
  await act(() => vi.advanceTimersByTimeAsync(1000))

  expect(store.getState().longPress).toBe(LongPressState.Inactive)
  expect(screen.queryByText(AlertText.DragAndDrop)).toBeNull()
})

it('a long press is not ended while another finger is still down', async () => {
  await dispatch(importText({ text: '- One' }))
  await act(vi.runOnlyPendingTimersAsync)

  await touchStart(getBulletByContext(['One']))
  await act(() => vi.advanceTimersByTimeAsync(TIMEOUT_LONG_PRESS_THOUGHT + 100))

  // a second finger lifts while the first still holds the thought
  await act(async () => {
    fireEvent.touchEnd(document.body, {
      touches: [{ clientX: 0, clientY: 0 }],
      changedTouches: [{ clientX: 10, clientY: 10 }],
    })
  })
  await act(() => vi.advanceTimersByTimeAsync(1000))

  expect(screen.queryByText(AlertText.DragAndDrop)).not.toBeNull()
  expect(isHighlighted(['One'])).toBe(true)
})
