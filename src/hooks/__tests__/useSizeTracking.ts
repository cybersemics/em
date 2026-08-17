import { renderHook } from '@testing-library/react'
import { act } from 'react'
import ThoughtId from '../../@types/ThoughtId'
import useSizeTracking from '../useSizeTracking'

it('returns a new sizes map when a tracked size is removed', () => {
  const { result } = renderHook(useSizeTracking)

  act(() => {
    result.current.setSize({
      cliff: 0,
      height: 20,
      id: 'thought-1' as ThoughtId,
      isVisible: true,
      key: 'thought-1',
    })
  })

  const sizesBeforeRemoval = result.current.sizes

  act(() => {
    result.current.setSize({
      cliff: 0,
      height: null,
      id: 'thought-1' as ThoughtId,
      isVisible: true,
      key: 'thought-1',
    })
  })

  expect(result.current.sizes).not.toBe(sizesBeforeRemoval)
  expect(result.current.sizes).toEqual({})
})
