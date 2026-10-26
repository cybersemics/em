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
  expect(result.current.sizes).toEqual({
    'thought-2': sizesBeforeRemoval['thought-2'],
  })
})

it('preserves the sizes map when the key is already absent', () => {
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
      id: 'thought-2' as ThoughtId,
      isVisible: true,
      key: 'thought-2',
    })
  })

  expect(result.current.sizes).toBe(sizesBeforeRemoval)
})

it('keeps the width when the size is removed until the width is removed', () => {
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

  expect(result.current.sizes).toEqual({ 'thought-1': { height: 20, cliff: 0, isVisible: true } })
  expect(result.current.widths).toEqual({ 'thought-1': 100 })

  // VirtualThought unmounts, e.g. when the thought is virtualized
  act(() => {
    result.current.setSize({
      cliff: 0,
      height: null,
      id: 'thought-1' as ThoughtId,
      isVisible: true,
      key: 'thought-1',
    })
  })

  expect(result.current.sizes).toEqual({})
  expect(result.current.widths).toEqual({ 'thought-1': 100 })

  // TreeNode unmounts when the thought leaves the tree
  act(() => {
    result.current.removeWidth('thought-1')
  })

  expect(result.current.widths).toEqual({})
})
