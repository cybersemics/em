import { renderHook } from '@testing-library/react'
import { act } from 'react'
import Autofocus from '../../@types/Autofocus'
import useDelayedAutofocus from '../useDelayedAutofocus'

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

it('updates the selected autofocus after the delay', () => {
  const { result, rerender } = renderHook(
    ({ autofocus }: { autofocus: Autofocus }) =>
      useDelayedAutofocus(autofocus, {
        delay: 750,
        selector: autofocusNew => autofocusNew === 'hide',
      }),
    { initialProps: { autofocus: 'show' as Autofocus } },
  )

  rerender({ autofocus: 'hide' })

  act(() => vi.advanceTimersByTime(749))
  expect(result.current).toBe(false)

  act(() => vi.advanceTimersByTime(1))
  expect(result.current).toBe(true)
})

it('cancels a delayed update on unmount', () => {
  const { rerender, unmount } = renderHook(
    ({ autofocus }: { autofocus: Autofocus }) =>
      useDelayedAutofocus(autofocus, { delay: 750, selector: value => value }),
    { initialProps: { autofocus: 'show' as Autofocus } },
  )

  rerender({ autofocus: 'hide' })
  expect(vi.getTimerCount()).toBe(1)

  unmount()
  expect(vi.getTimerCount()).toBe(0)
})
