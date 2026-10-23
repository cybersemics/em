import { renderHook } from '@testing-library/react'
import React, { act } from 'react'
import useSwipeToClear from '../useSwipeToClear'

/** A touch event at the given point, with the fields the swipe handlers read. */
const touchAt = (x: number, y: number) =>
  ({
    touches: [{ pageX: x, pageY: y, clientX: x, clientY: y }],
    stopPropagation: () => {},
  }) as unknown as React.TouchEvent

/** Swipes the full dismiss distance, which dismisses at once without an animation. */
const swipeAway = (handlers: ReturnType<typeof useSwipeToClear>['touchHandlers']) =>
  act(() => {
    handlers.onTouchStart(touchAt(100, 300))
    handlers.onTouchMove(touchAt(400, 300))
    handlers.onTouchEnd(touchAt(400, 300))
  })

it('calls onDismissed once, however many dismissals follow', () => {
  const onDismissed = vi.fn()
  const { result } = renderHook(() => useSwipeToClear({ onDismissed }))

  swipeAway(result.current.touchHandlers)
  // The surface is swiped again and Clear is pressed after it has already been dismissed.
  swipeAway(result.current.touchHandlers)
  act(() => result.current.dismiss())

  expect(onDismissed).toHaveBeenCalledOnce()
})

it('can be dismissed again after reset, for the next showing', () => {
  const onDismissed = vi.fn()
  const { result } = renderHook(() => useSwipeToClear({ onDismissed }))

  swipeAway(result.current.touchHandlers)
  act(() => result.current.reset())
  swipeAway(result.current.touchHandlers)

  expect(onDismissed).toHaveBeenCalledTimes(2)
})
