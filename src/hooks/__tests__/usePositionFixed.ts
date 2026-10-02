import { act, renderHook } from '@testing-library/react'
import virtualKeyboardStore from '../../stores/virtualKeyboardStore'
import usePositionFixed from '../usePositionFixed'

vi.mock('../../browser', async importOriginal => ({
  ...(await importOriginal<typeof import('../../browser')>()),
  isSafari: () => false,
}))

it('updates keyboard positioning without rendering its consumer on each animation frame', () => {
  const rendered = vi.fn()
  const { unmount } = renderHook(() => {
    rendered()
    return usePositionFixed({ fromBottom: true, height: 48 })
  })

  act(() => virtualKeyboardStore.update({ open: true }))
  rendered.mockClear()

  ;[40, 80, 120, 160, 200].forEach(height => {
    act(() => virtualKeyboardStore.update({ height }))
  })

  expect(document.documentElement.style.getPropertyValue('--virtual-keyboard-height')).toBe('200px')
  expect(rendered).not.toHaveBeenCalled()
  unmount()
})

it('animates the supplied elements from the transition clock and releases them at its endpoint', () => {
  vi.useFakeTimers()
  const anchor = document.createElement('div')
  const animation = { startTime: null as number | null, cancel: vi.fn() }
  anchor.animate = vi.fn(() => animation as unknown as Animation)
  const elementRefs = [{ current: anchor }]
  const { unmount } = renderHook(() => usePositionFixed({ fromBottom: true, height: 48, elementRefs }))

  act(() => {
    virtualKeyboardStore.update({
      open: true,
      motion: { startedAt: Date.now() - 150, duration: 300, heights: [0, 150, 300] },
    })
  })

  expect(anchor.animate).toHaveBeenCalledOnce()
  expect(animation.startTime).toBeCloseTo(performance.now() - 150)
  act(() => virtualKeyboardStore.update({ height: 300, motion: undefined }))
  expect(animation.cancel).toHaveBeenCalledOnce()
  unmount()
})
