import { renderHook } from '@testing-library/react'
import Command from '../../@types/Command'
import useGestureHighlight from '../useGestureHighlight'

/** Creates a minimal Command fixture for testing. */
const cmd = (id: string, gesture?: string): Command =>
  ({ id, label: id, gesture, multicursor: false, exec: () => {} }) as Command

describe('useGestureHighlight', () => {
  it('returns undefined when disabled', () => {
    const { result } = renderHook(() => useGestureHighlight(cmd('indent', 'rd'), 'rd', false, true))
    expect(result.current).toBeUndefined()
  })

  it('returns undefined when gestureInProgress is undefined', () => {
    const { result } = renderHook(() => useGestureHighlight(cmd('indent', 'rd'), undefined, false, false))
    expect(result.current).toBeUndefined()
  })

  it('returns gestureInProgress.length for normal commands', () => {
    const { result } = renderHook(() => useGestureHighlight(cmd('indent', 'rd'), 'r', false, false))
    expect(result.current).toBe(1)
  })

  it('returns gestureInProgress.length for a longer in-progress gesture', () => {
    const { result } = renderHook(() => useGestureHighlight(cmd('indent', 'rd'), 'rd', false, false))
    expect(result.current).toBe(2)
  })

  it('returns undefined for cancel when not selected', () => {
    const { result } = renderHook(() => useGestureHighlight(cmd('cancel'), 'rd', false, false))
    expect(result.current).toBeUndefined()
  })

  it('returns 1 for cancel when selected', () => {
    const { result } = renderHook(() => useGestureHighlight(cmd('cancel'), 'rd', true, false))
    expect(result.current).toBe(1)
  })

  it('returns correct highlight for openMobileCommandUniverse with full match', () => {
    const gesture = 'rdld'
    const { result } = renderHook(() =>
      useGestureHighlight(cmd('openMobileCommandUniverse', gesture), 'rdld', false, false),
    )
    expect(result.current).toBe(4)
  })

  it('returns correct highlight for openMobileCommandUniverse with partial end match', () => {
    const gesture = 'rdld'
    // gesture in progress ends with 'r' which matches first char of rdld
    const { result } = renderHook(() =>
      useGestureHighlight(cmd('openMobileCommandUniverse', gesture), 'ur', false, false),
    )
    expect(result.current).toBe(1)
  })

  it('returns 0 for openMobileCommandUniverse with no end match', () => {
    const gesture = 'rdld'
    const { result } = renderHook(() =>
      useGestureHighlight(cmd('openMobileCommandUniverse', gesture), 'u', false, false),
    )
    expect(result.current).toBe(0)
  })
})
