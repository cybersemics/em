import { act, renderHook, waitFor } from '@testing-library/react'
import virtualKeyboardStore from '../../stores/virtualKeyboardStore'
import useScrollCursorIntoView from '../useScrollCursorIntoView'

const scrollCursorIntoView = vi.hoisted(() => vi.fn())

vi.mock('../../device/scrollCursorIntoView', () => ({ default: scrollCursorIntoView }))

beforeEach(() => {
  scrollCursorIntoView.mockReset()
  virtualKeyboardStore.update({ open: false, height: 0, ...{ targetHeight: 0 } })
})

// https://github.com/cybersemics/em/issues/3765
it('rechecks cursor visibility when the keyboard target height changes', async () => {
  const { unmount } = renderHook(() => useScrollCursorIntoView(600, 30))
  scrollCursorIntoView.mockClear()

  act(() => {
    // The spread keeps this regression test source-compatible with the pre-fix VirtualKeyboardState.
    virtualKeyboardStore.update({ open: true, height: 0, ...{ targetHeight: 300 } })
  })

  await waitFor(() => expect(scrollCursorIntoView).toHaveBeenCalledOnce())
  expect(scrollCursorIntoView).toHaveBeenCalledWith(600, 30)
  unmount()
})
