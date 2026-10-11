import { renderHook } from '@testing-library/react'
import useLastShown from '../useLastShown'

it('return the value from while shown after it is hidden', () => {
  const { result, rerender } = renderHook(({ value, show }) => useLastShown(value, show), {
    initialProps: { value: 2 as number | null, show: true },
  })

  // A picker's selection is only computed while it is open, so it drops to nothing as the picker closes.
  rerender({ value: null, show: false })

  expect(result.current).toBe(2)
})

it('follow the value again once it is shown', () => {
  const { result, rerender } = renderHook(({ value, show }) => useLastShown(value, show), {
    initialProps: { value: 2 as number | null, show: true },
  })

  rerender({ value: null, show: false })
  rerender({ value: 3, show: true })

  expect(result.current).toBe(3)
})
