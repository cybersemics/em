import { act, renderHook } from '@testing-library/react'
import viewportStore from '../../stores/viewportStore'
import virtualKeyboardStore from '../../stores/virtualKeyboardStore'
import useVirtualKeyboardCssProperty from '../useVirtualKeyboardCssProperty'

it('binds progress locally without rendering and restores the previous style on unmount', () => {
  const element = document.createElement('div')
  element.style.setProperty('--virtual-keyboard-open-percent', '0.75', 'important')
  const elementRefs = [{ current: element }]
  const rendered = vi.fn()
  const { unmount } = renderHook(() => {
    rendered()
    useVirtualKeyboardCssProperty('openPercent', elementRefs)
  })
  viewportStore.update({ virtualKeyboardHeight: 200 })
  act(() => virtualKeyboardStore.update({ open: true, height: 100 }))

  expect(element.style.getPropertyValue('--virtual-keyboard-open-percent')).toBe('0.5')
  expect(rendered).toHaveBeenCalledOnce()
  unmount()
  expect(element.style.getPropertyValue('--virtual-keyboard-open-percent')).toBe('0.75')
  expect(element.style.getPropertyPriority('--virtual-keyboard-open-percent')).toBe('important')
  act(() => virtualKeyboardStore.update({ height: 0 }))
  expect(element.style.getPropertyValue('--virtual-keyboard-open-percent')).toBe('0.75')
})
