import { act, renderHook } from '@testing-library/react'
import { MotionValue } from 'motion/react'
import viewportStore from '../../stores/viewportStore'
import virtualKeyboardStore from '../../stores/virtualKeyboardStore'
import usePositionFixed from '../usePositionFixed'

const platform = vi.hoisted(() => ({ safari: false, capacitor: false }))

afterEach(() => {
  platform.safari = false
  platform.capacitor = false
})

vi.mock('../../browser', async importOriginal => ({
  ...(await importOriginal<typeof import('../../browser')>()),
  isSafari: () => platform.safari,
  isCapacitor: () => platform.capacitor,
}))

it('returns ref-free translation styles without rendering its consumer on height updates', () => {
  vi.useFakeTimers()
  const rendered = vi.fn()
  const { result, unmount } = renderHook(() => {
    rendered()
    return usePositionFixed({ fromBottom: true, height: 48, offset: 12 })
  })
  act(() => virtualKeyboardStore.update({ open: true }))
  rendered.mockClear()
  const translate = result.current.translate!
  ;[40, 80, 120, 160, 200].forEach(height => {
    act(() => {
      virtualKeyboardStore.update({ height })
      vi.advanceTimersByTime(20)
    })
    expect(translate.get()).toBe(`0 ${-height}px`)
  })
  expect(result.current).toMatchObject({ position: 'fixed', bottom: 'calc(env(safe-area-inset-bottom) + 12px)' })
  expect(result.current.translate).toBe(translate)
  expect(rendered).not.toHaveBeenCalled()
  unmount()
  act(() => {
    virtualKeyboardStore.update({ height: 250 })
    vi.advanceTimersByTime(20)
  })
  expect(translate.get()).toBe('0 -200px')
})

it('uses current height immediately when a consumer mounts mid-transition', () => {
  virtualKeyboardStore.update({ open: true, height: 125 })
  const { result, unmount } = renderHook(() => usePositionFixed({ fromBottom: true }))
  expect(result.current.translate!.get()).toBe('0 -125px')
  unmount()
})

it('keeps ordinary styles for top-anchored consumers', () => {
  const { result, unmount } = renderHook(() => usePositionFixed({ offset: 12 }))
  expect(result.current).toEqual({ position: 'fixed', top: 'calc(env(safe-area-inset-top) + 12px)', bottom: undefined })
  unmount()
})

it('keeps the absolute-position fallback on mobile Safari and updates its top without rendering', () => {
  platform.safari = true
  vi.spyOn(document.body, 'scrollHeight', 'get').mockReturnValue(1000)
  viewportStore.update({ innerHeight: 800 })
  virtualKeyboardStore.update({ open: true, height: 100 })
  const rendered = vi.fn()
  const { result, unmount } = renderHook(() => {
    rendered()
    return usePositionFixed({ fromBottom: true, height: 48, offset: 12 })
  })
  expect(result.current.position).toBe('absolute')
  expect((result.current.top as MotionValue<string>).get()).toBe(
    'calc(min(1000px, 800px - 100px) - 60px - env(safe-area-inset-bottom))',
  )
  act(() => virtualKeyboardStore.update({ height: 200 }))
  expect((result.current.top as MotionValue<string>).get()).toBe(
    'calc(min(1000px, 800px - 200px) - 60px - env(safe-area-inset-bottom))',
  )
  expect(rendered).toHaveBeenCalledOnce()
  unmount()
})
