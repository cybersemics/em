import viewportStore from '../viewportStore'
import virtualKeyboardStore from '../virtualKeyboardStore'

it('derives progress from height and visibility without publishing DOM styles or animation state', () => {
  viewportStore.update({ virtualKeyboardHeight: 200 })
  virtualKeyboardStore.update({ open: true, height: 100 })
  expect(virtualKeyboardStore.getState()).toEqual({ open: true, height: 100, openPercent: 0.5, phase: undefined })
  expect(document.documentElement.style.getPropertyValue('--virtual-keyboard-height')).toBe('')
  virtualKeyboardStore.update({ open: false })
  expect(virtualKeyboardStore.getState().openPercent).toBe(0)
})
