import { renderHook } from '@testing-library/react'
import { act } from 'react'
import ThoughtId from '../../@types/ThoughtId'
import useSizeTracking from '../useSizeTracking'

it('removes only the tracked size', () => {
  const { result } = renderHook(useSizeTracking)

  act(() => {
    result.current.setSize({
      cliff: 0,
      height: 20,
      id: 'thought-1' as ThoughtId,
      isVisible: true,
      key: 'thought-1',
    })
    result.current.setSize({
      cliff: 0,
      height: 30,
      id: 'thought-2' as ThoughtId,
      isVisible: true,
      key: 'thought-2',
    })
  })

  const heightsBeforeRemoval = result.current.heights

  act(() => {
    result.current.setSize({
      cliff: 0,
      height: null,
      id: 'thought-1' as ThoughtId,
      isVisible: true,
      key: 'thought-1',
    })
  })

  expect(result.current.heights).not.toBe(heightsBeforeRemoval)
  expect(result.current.heights).toEqual({
    'thought-2': heightsBeforeRemoval['thought-2'],
  })
})

it('preserves the heights map when the key is already absent', () => {
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

  const heightsBeforeRemoval = result.current.heights

  act(() => {
    result.current.setSize({
      cliff: 0,
      height: null,
      id: 'thought-2' as ThoughtId,
      isVisible: true,
      key: 'thought-2',
    })
  })

  expect(result.current.heights).toBe(heightsBeforeRemoval)
})

it('tracks widths separately and removes them with the height', () => {
  const { result } = renderHook(useSizeTracking)

  act(() => {
    result.current.setSize({
      cliff: 0,
      height: 20,
      width: 100,
      id: 'thought-1' as ThoughtId,
      isVisible: true,
      key: 'thought-1',
    })
  })

  expect(result.current.heights).toEqual({ 'thought-1': { height: 20, cliff: 0, isVisible: true } })
  expect(result.current.widths).toEqual({ 'thought-1': 100 })

  act(() => {
    result.current.setSize({
      cliff: 0,
      height: null,
      id: 'thought-1' as ThoughtId,
      isVisible: true,
      key: 'thought-1',
    })
  })

  expect(result.current.heights).toEqual({})
  expect(result.current.widths).toEqual({})
})
